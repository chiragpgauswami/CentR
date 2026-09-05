import { BrainCache } from '../cache.js';
import { BrainMetricsCollector } from '../metrics.js';
import { buildAnalyzeFailurePrompt } from '../prompts/analyze-failure.js';
import { buildClassifyTaskPrompt } from '../prompts/classify-task.js';
import { buildExtractLearningPrompt } from '../prompts/extract-learning.js';
import { buildRankContextPrompt } from '../prompts/rank-context.js';
import { buildSelectSkillsPrompt } from '../prompts/select-skills.js';
import { buildSummarizePrompt } from '../prompts/summarize.js';
import {
  BrainCapabilities,
  BrainModelNotFoundError,
  BrainProvider,
  BrainProviderError,
  BrainTimeoutError,
  BrainUnavailableError,
  ContextRankingInput,
  ContextRankingOutput,
  FailureAnalysisInput,
  FailureAnalysisOutput,
  LearningExtractionInput,
  LearningExtractionOutput,
  PROFILE_PRESETS,
  ProfileConfig,
  ResourceProfile,
  SkillSelectionInput,
  SkillSelectionOutput,
  SummarizationInput,
  SummarizationOutput,
  TaskClassificationInput,
  TaskClassificationOutput,
} from '../types.js';
import {
  extractJsonFromText,
  validateContextRanking,
  validateFailureAnalysis,
  validateLearningExtraction,
  validateSkillSelection,
  validateSummarization,
  validateTaskClassification,
} from '../validation.js';

export interface OllamaProviderOptions {
  endpoint?: string;
  model?: string;
  profile?: ResourceProfile;
  timeoutMs?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  cache?: BrainCache;
  metrics?: BrainMetricsCollector;
}

export class OllamaProvider implements BrainProvider {
  readonly name = 'ollama';
  private endpoint: string;
  private model: string;
  private profileConfig: ProfileConfig;
  private cache: BrainCache;
  private metrics: BrainMetricsCollector;

  constructor(options: OllamaProviderOptions = {}) {
    this.endpoint = (options.endpoint || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    const profile = options.profile || 'minimal';
    this.profileConfig = {
      ...PROFILE_PRESETS[profile],
      ...(options.model ? { model: options.model } : {}),
      ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.maxInputTokens ? { maxInputTokens: options.maxInputTokens } : {}),
      ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
    };
    this.model = this.profileConfig.model;
    this.cache = options.cache || new BrainCache();
    this.metrics = options.metrics || new BrainMetricsCollector();
  }

  capabilities(): BrainCapabilities {
    return {
      supportedTasks: [
        'classifyTask',
        'rankContext',
        'extractLearning',
        'analyzeFailure',
        'selectSkills',
        'summarize',
      ],
      maxContextTokens: this.profileConfig.maxInputTokens,
      supportsStreaming: false,
      supportsJsonFormat: true,
    };
  }

  async isReady(): Promise<boolean> {
    try {
      const res = await fetch(`${this.endpoint}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.endpoint}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        throw new BrainUnavailableError(`Ollama returned status ${res.status}`);
      }
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      return (data.models || []).map((m) => m.name);
    } catch (err) {
      if (err instanceof BrainUnavailableError) throw err;
      throw new BrainUnavailableError(
        'Could not reach Ollama daemon',
        err instanceof Error ? err : undefined,
      );
    }
  }

  private async generate(system: string, user: string, operation: string): Promise<string> {
    const inputPayload = { system, user };
    const cacheKey = this.cache.computeKey(operation, this.model, inputPayload);

    const cached = this.cache.get<string>(cacheKey);
    if (cached) {
      this.metrics.recordCacheHit();
      return cached;
    }
    this.metrics.recordCacheMiss();

    const estimatedInputTokens = Math.ceil((system.length + user.length) / 4);
    this.metrics.recordCall(estimatedInputTokens);

    const startTime = Date.now();
    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: user,
          system,
          stream: false,
          format: 'json',
          options: {
            num_predict: this.profileConfig.maxOutputTokens,
            temperature: 0.1, // low temperature for deterministic structured reasoning
          },
        }),
        signal: AbortSignal.timeout(this.profileConfig.timeoutMs),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 404) {
          throw new BrainModelNotFoundError(this.model);
        }
        const errorText = await response.text();
        throw new BrainProviderError(`Ollama API error (${response.status}): ${errorText}`);
      }

      const body = (await response.json()) as { response?: string };
      const rawOutput = body.response ?? '';
      const estimatedOutputTokens = Math.ceil(rawOutput.length / 4);

      this.metrics.recordSuccess(latencyMs, estimatedOutputTokens);
      this.cache.set(cacheKey, rawOutput);
      return rawOutput;
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      if (err instanceof BrainModelNotFoundError || err instanceof BrainProviderError) {
        this.metrics.recordFailure(latencyMs);
        throw err;
      }
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        this.metrics.recordTimeout();
        throw new BrainTimeoutError(this.profileConfig.timeoutMs, err);
      }
      this.metrics.recordFailure(latencyMs);
      throw new BrainUnavailableError(
        'Failed to communicate with Ollama',
        err instanceof Error ? err : undefined,
      );
    }
  }

  async classifyTask(input: TaskClassificationInput): Promise<TaskClassificationOutput> {
    const { system, user } = buildClassifyTaskPrompt(input);
    const raw = await this.generate(system, user, 'classifyTask');
    const json = extractJsonFromText(raw);
    return validateTaskClassification(json);
  }

  async rankContext(input: ContextRankingInput): Promise<ContextRankingOutput> {
    const allowedIds = new Set(input.candidates.map((c) => c.id));
    const { system, user } = buildRankContextPrompt(input);
    const raw = await this.generate(system, user, 'rankContext');
    const json = extractJsonFromText(raw);
    return validateContextRanking(json, allowedIds);
  }

  async extractLearning(input: LearningExtractionInput): Promise<LearningExtractionOutput> {
    const { system, user } = buildExtractLearningPrompt(input);
    const raw = await this.generate(system, user, 'extractLearning');
    const json = extractJsonFromText(raw);
    return validateLearningExtraction(json);
  }

  async analyzeFailure(input: FailureAnalysisInput): Promise<FailureAnalysisOutput> {
    const { system, user } = buildAnalyzeFailurePrompt(input);
    const raw = await this.generate(system, user, 'analyzeFailure');
    const json = extractJsonFromText(raw);
    return validateFailureAnalysis(json);
  }

  async selectSkills(input: SkillSelectionInput): Promise<SkillSelectionOutput> {
    const allowedSkillIds = new Set(input.candidateSkills.map((s) => s.id));
    const { system, user } = buildSelectSkillsPrompt(input);
    const raw = await this.generate(system, user, 'selectSkills');
    const json = extractJsonFromText(raw);
    return validateSkillSelection(json, allowedSkillIds);
  }

  async summarize(input: SummarizationInput): Promise<SummarizationOutput> {
    const { system, user } = buildSummarizePrompt(input);
    const raw = await this.generate(system, user, 'summarize');
    const json = extractJsonFromText(raw);
    return validateSummarization(json, input.sourceId);
  }
}
