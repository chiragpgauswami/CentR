/**
 * CentR Brain V2 - Local Brain Implementation, Low-End Optimization & Middleware Intelligence
 */

export * from './cache.js';
export * from './hardware.js';
export * from './metrics.js';
export * from './providers/mock.js';
export * from './providers/null.js';
export * from './providers/ollama.js';
export * from './types.js';
export * from './validation.js';

export * from './prompts/analyze-failure.js';
export * from './prompts/classify-task.js';
export * from './prompts/extract-learning.js';
export * from './prompts/rank-context.js';
export * from './prompts/select-skills.js';
export * from './prompts/summarize.js';

import { BrainCache } from './cache.js';
import { BrainMetricsCollector } from './metrics.js';
import { MockBrainProvider } from './providers/mock.js';
import { NullBrainProvider } from './providers/null.js';
import { OllamaProvider } from './providers/ollama.js';
import type {
  BrainProvider,
  ContextRankingInput,
  ContextRankingOutput,
  FailureAnalysisInput,
  FailureAnalysisOutput,
  LearningExtractionInput,
  LearningExtractionOutput,
  ResourceProfile,
  SkillSelectionInput,
  SkillSelectionOutput,
  SummarizationInput,
  SummarizationOutput,
  TaskClassificationInput,
  TaskClassificationOutput,
} from './types.js';

// Legacy V1 TaskClassifier / ContextRanker types for backward compatibility
export type TaskType =
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'test'
  | 'documentation'
  | 'configuration'
  | 'security'
  | 'performance'
  | 'dependency'
  | 'unknown';

export interface TaskClassification {
  type: TaskType;
  keywords: string[];
  domains: string[];
  confidence: number;
}

export interface TaskClassifier {
  classify(task: string): Promise<TaskClassification>;
}

export interface ContextRanker {
  rank(
    task: string,
    items: Array<{ content: string; metadata: Record<string, unknown> }>,
  ): Promise<Array<{ index: number; score: number; reasoning?: string }>>;
}

export interface ExperienceReport {
  task: string;
  attempts: Array<{
    action: string;
    result: 'success' | 'failure';
    details: string;
  }>;
  finalOutcome: 'success' | 'failure';
  rootCause?: string;
}

export interface ExtractedLesson {
  lesson: string;
  category: string;
  trigger: string;
  recommendedAction: string;
  confidence: number;
}

export interface LearningExtractor {
  extract(experience: ExperienceReport): Promise<ExtractedLesson[]>;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  reasoning?: string;
}

/**
 * Deterministic task classifier that works without an LLM.
 */
export class DeterministicTaskClassifier implements TaskClassifier {
  private static readonly TASK_PATTERNS: Record<TaskType, RegExp[]> = {
    feature: [
      /\badd\b/i,
      /\bcreate\b/i,
      /\bimplement\b/i,
      /\bbuild\b/i,
      /\bnew\b/i,
      /\bintroduce\b/i,
      /\bintegrat/i,
    ],
    bugfix: [
      /\bfix\b/i,
      /\bbug\b/i,
      /\berror\b/i,
      /\bcrash\b/i,
      /\bfail/i,
      /\bbroken\b/i,
      /\bissue\b/i,
      /\bwrong\b/i,
      /\bincorrect\b/i,
    ],
    refactor: [
      /\brefactor\b/i,
      /\bclean\s*up\b/i,
      /\brestructure\b/i,
      /\breorganize\b/i,
      /\bsimplif/i,
      /\bextract\b/i,
      /\bmove\b/i,
      /\brename\b/i,
    ],
    test: [
      /\btest\b/i,
      /\bspec\b/i,
      /\bcoverage\b/i,
      /\bassert/i,
      /\bunit test/i,
      /\bintegration test/i,
      /\be2e\b/i,
    ],
    documentation: [
      /\bdoc/i,
      /\breadme\b/i,
      /\bcomment\b/i,
      /\bjsdoc\b/i,
      /\bchangelog\b/i,
      /\bapi doc/i,
    ],
    configuration: [
      /\bconfig/i,
      /\bsetup\b/i,
      /\benvironment\b/i,
      /\benv\b/i,
      /\bsetting/i,
      /\binitializ/i,
    ],
    security: [
      /\bsecur/i,
      /\bauth/i,
      /\bpassword\b/i,
      /\btoken\b/i,
      /\bpermission\b/i,
      /\brole\b/i,
      /\baccess\b/i,
      /\bencrypt/i,
      /\bvulnerab/i,
    ],
    performance: [
      /\bperformance\b/i,
      /\boptimiz/i,
      /\bspeed\b/i,
      /\bfast/i,
      /\bslow\b/i,
      /\bbottleneck\b/i,
      /\bcache\b/i,
      /\bmemory\b/i,
      /\blatenc/i,
    ],
    dependency: [
      /\bupgrad/i,
      /\bupdate\b/i,
      /\bdependen/i,
      /\bpackage\b/i,
      /\bversion\b/i,
      /\bmigrat/i,
      /\bbump\b/i,
    ],
    unknown: [],
  };

  private static readonly DOMAIN_KEYWORDS: Record<string, RegExp[]> = {
    authentication: [
      /\bauth/i,
      /\blogin\b/i,
      /\bsign[- ]?in\b/i,
      /\boauth\b/i,
      /\bjwt\b/i,
      /\bsso\b/i,
    ],
    database: [
      /\bdb\b/i,
      /\bdatabase\b/i,
      /\bsql\b/i,
      /\bquery\b/i,
      /\bmigration\b/i,
      /\borm\b/i,
      /\bschema\b/i,
    ],
    api: [/\bapi\b/i, /\bendpoint\b/i, /\broute\b/i, /\brest\b/i, /\bgraphql\b/i, /\bgrpc\b/i],
    ui: [
      /\bui\b/i,
      /\bfrontend\b/i,
      /\bcomponent\b/i,
      /\bpage\b/i,
      /\bview\b/i,
      /\bcss\b/i,
      /\bstyle\b/i,
      /\blayout\b/i,
    ],
    testing: [/\btest/i, /\bspec\b/i, /\bmock\b/i, /\bstub\b/i, /\bfixture\b/i],
    deployment: [/\bdeploy/i, /\bci\b/i, /\bcd\b/i, /\bdocker\b/i, /\bkubernetes\b/i, /\bk8s\b/i],
    middleware: [/\bmiddleware\b/i, /\binterceptor\b/i, /\bfilter\b/i, /\bguard\b/i, /\bpipe\b/i],
    storage: [/\bstorage\b/i, /\bfile\b/i, /\bupload\b/i, /\bs3\b/i, /\bblob\b/i],
    email: [/\bemail\b/i, /\bmail\b/i, /\bsmtp\b/i, /\bnotif/i],
    payment: [/\bpay/i, /\bstripe\b/i, /\bbilling\b/i, /\bsubscription\b/i, /\binvoice\b/i],
  };

  async classify(task: string): Promise<TaskClassification> {
    let bestType: TaskType = 'unknown';
    let bestScore = 0;

    for (const [type, patterns] of Object.entries(DeterministicTaskClassifier.TASK_PATTERNS)) {
      if (type === 'unknown') continue;
      const matches = patterns.filter((p) => p.test(task)).length;
      const score = matches / patterns.length;
      if (score > bestScore) {
        bestScore = score;
        bestType = type as TaskType;
      }
    }

    const keywords = this.extractKeywords(task);
    const domains: string[] = [];
    for (const [domain, patterns] of Object.entries(DeterministicTaskClassifier.DOMAIN_KEYWORDS)) {
      if (patterns.some((p) => p.test(task))) {
        domains.push(domain);
      }
    }

    return {
      type: bestType,
      keywords,
      domains,
      confidence: bestScore > 0 ? Math.min(bestScore * 2, 0.9) : 0.1,
    };
  }

  private extractKeywords(task: string): string[] {
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'shall',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'and',
      'but',
      'or',
      'not',
      'so',
      'if',
      'then',
      'that',
      'this',
      'it',
      'its',
      'my',
      'your',
      'our',
      'their',
      'we',
      'they',
      'i',
      'me',
      'him',
      'her',
      'us',
      'them',
    ]);

    return task
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
      .filter((w, i, arr) => arr.indexOf(w) === i);
  }
}

/**
 * Deterministic context ranker that works without an LLM.
 */
export class DeterministicContextRanker implements ContextRanker {
  async rank(
    task: string,
    items: Array<{ content: string; metadata: Record<string, unknown> }>,
  ): Promise<Array<{ index: number; score: number }>> {
    const taskLower = task.toLowerCase();
    const taskWords = taskLower.split(/\s+/).filter((w) => w.length > 2);

    return items.map((item, index) => {
      const contentLower = item.content.toLowerCase();
      let score = 0;

      for (const word of taskWords) {
        if (contentLower.includes(word)) {
          score += 0.2;
        }
      }

      if (contentLower.includes(taskLower)) {
        score += 0.5;
      }

      const type = item.metadata?.['type'] as string | undefined;
      if (type === 'symbol') score += 0.1;
      if (type === 'memory') score += 0.15;
      if (type === 'learning' && item.metadata?.['status'] === 'validated') score += 0.2;

      return { index, score: Math.min(score, 1.0) };
    });
  }
}

/**
 * Factory to create configured BrainProvider based on user settings.
 */
export function createBrainProvider(config?: {
  enabled?: boolean;
  provider?: string | null;
  model?: string;
  profile?: ResourceProfile;
  endpoint?: string;
  timeoutMs?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  cache?: BrainCache;
  metrics?: BrainMetricsCollector;
}): BrainProvider {
  if (!config || !config.enabled) {
    return new NullBrainProvider();
  }

  if (config.provider === 'mock') {
    return new MockBrainProvider();
  }

  if (config.provider === 'ollama') {
    return new OllamaProvider({
      endpoint: config.endpoint,
      model: config.model,
      profile: config.profile,
      timeoutMs: config.timeoutMs,
      maxInputTokens: config.maxInputTokens,
      maxOutputTokens: config.maxOutputTokens,
      cache: config.cache,
      metrics: config.metrics,
    });
  }

  return new NullBrainProvider();
}

/**
 * Unified BrainManager coordinating provider, metrics, cache, and fallbacks.
 */
export class BrainManager {
  private provider: BrainProvider;
  private cache: BrainCache;
  private metrics: BrainMetricsCollector;
  private classifier: DeterministicTaskClassifier;
  private ranker: DeterministicContextRanker;

  constructor(
    provider?: BrainProvider,
    options?: { cache?: BrainCache; metrics?: BrainMetricsCollector },
  ) {
    this.provider = provider || new NullBrainProvider();
    this.cache = options?.cache || new BrainCache();
    this.metrics = options?.metrics || new BrainMetricsCollector();
    this.classifier = new DeterministicTaskClassifier();
    this.ranker = new DeterministicContextRanker();
  }

  getProvider(): BrainProvider {
    return this.provider;
  }

  setProvider(provider: BrainProvider): void {
    this.provider = provider;
  }

  getMetrics(): BrainMetricsCollector {
    return this.metrics;
  }

  getCache(): BrainCache {
    return this.cache;
  }

  getClassifier(): DeterministicTaskClassifier {
    return this.classifier;
  }

  getRanker(): DeterministicContextRanker {
    return this.ranker;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.provider || this.provider.name === 'none') {
      return false;
    }
    return await this.provider.isReady();
  }

  /**
   * Classify task with graceful deterministic fallback.
   */
  async classifyTask(input: TaskClassificationInput): Promise<TaskClassificationOutput> {
    const cacheKey = this.cache.computeKey('classifyTask', this.provider.name, input);
    const cached = this.cache.get<TaskClassificationOutput>(cacheKey);
    if (cached) {
      this.metrics.recordCacheHit();
      return cached;
    }
    this.metrics.recordCacheMiss();

    const startTime = Date.now();
    this.metrics.recordCall(Math.ceil(input.task.length / 4));

    if (this.provider.name !== 'none') {
      try {
        const result = await this.provider.classifyTask(input);
        this.metrics.recordSuccess(Date.now() - startTime, 50);
        this.cache.set(cacheKey, result);
        return result;
      } catch {
        this.metrics.recordFallback();
      }
    }

    // Deterministic fallback
    const det = await this.classifier.classify(input.task);
    const fallbackResult: TaskClassificationOutput = {
      category: det.type,
      subcategories: det.domains,
      entities: det.keywords,
      risk: det.type === 'security' ? 'high' : 'low',
      confidence: det.confidence,
      suggestedDomains: det.domains,
    };
    this.metrics.recordSuccess(Date.now() - startTime, 20);
    this.cache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  /**
   * Rank candidate context items with graceful deterministic fallback.
   */
  async rankContext(input: ContextRankingInput): Promise<ContextRankingOutput> {
    const cacheKey = this.cache.computeKey('rankContext', this.provider.name, input);
    const cached = this.cache.get<ContextRankingOutput>(cacheKey);
    if (cached) {
      this.metrics.recordCacheHit();
      return cached;
    }
    this.metrics.recordCacheMiss();

    const startTime = Date.now();
    this.metrics.recordCall(Math.ceil(JSON.stringify(input).length / 4));

    if (this.provider.name !== 'none' && input.candidates.length > 0) {
      try {
        const result = await this.provider.rankContext(input);
        this.metrics.recordSuccess(Date.now() - startTime, 100);
        this.cache.set(cacheKey, result);
        return result;
      } catch {
        this.metrics.recordFallback();
      }
    }

    // Deterministic fallback
    const items = input.candidates.map((c) => ({
      id: c.id,
      score: c.deterministicScore,
      reason: `Deterministically matched relevance (${c.deterministicScore.toFixed(2)})`,
    }));

    items.sort((a, b) => b.score - a.score);
    const fallbackResult: ContextRankingOutput = {
      items,
      reasoning: 'Deterministic ranking fallback',
    };
    this.metrics.recordSuccess(Date.now() - startTime, 50);
    this.cache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  /**
   * Extract learning with graceful fallback.
   */
  async extractLearning(input: LearningExtractionInput): Promise<LearningExtractionOutput> {
    const cacheKey = this.cache.computeKey('extractLearning', this.provider.name, input);
    const cached = this.cache.get<LearningExtractionOutput>(cacheKey);
    if (cached) {
      this.metrics.recordCacheHit();
      return cached;
    }
    this.metrics.recordCacheMiss();

    const startTime = Date.now();
    this.metrics.recordCall(Math.ceil(JSON.stringify(input).length / 4));

    if (this.provider.name !== 'none') {
      try {
        const result = await this.provider.extractLearning(input);
        this.metrics.recordSuccess(Date.now() - startTime, 80);
        this.cache.set(cacheKey, result);
        return result;
      } catch {
        this.metrics.recordFallback();
      }
    }

    // Deterministic fallback
    const fallbackResult: LearningExtractionOutput = {
      lesson: `When handling task "${input.task}", follow validated project conventions`,
      category: 'workflow',
      trigger: input.task.slice(0, 40),
      recommendedAction: input.fix || 'Ensure prerequisites are configured',
      confidence: 0.5,
      generalizable: true,
      evidence: [input.error || 'Observed task execution outcome'],
    };
    this.metrics.recordSuccess(Date.now() - startTime, 40);
    this.cache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  /**
   * Analyze failure with graceful fallback.
   */
  async analyzeFailure(input: FailureAnalysisInput): Promise<FailureAnalysisOutput> {
    const cacheKey = this.cache.computeKey('analyzeFailure', this.provider.name, input);
    const cached = this.cache.get<FailureAnalysisOutput>(cacheKey);
    if (cached) {
      this.metrics.recordCacheHit();
      return cached;
    }
    this.metrics.recordCacheMiss();

    const startTime = Date.now();
    this.metrics.recordCall(Math.ceil(JSON.stringify(input).length / 4));

    if (this.provider.name !== 'none') {
      try {
        const result = await this.provider.analyzeFailure(input);
        this.metrics.recordSuccess(Date.now() - startTime, 80);
        this.cache.set(cacheKey, result);
        return result;
      } catch {
        this.metrics.recordFallback();
      }
    }

    // Deterministic fallback
    const err = input.error.toLowerCase();
    const failureType =
      err.includes('env') || err.includes('config')
        ? 'configuration'
        : err.includes('type')
          ? 'type_error'
          : 'other';

    const fallbackResult: FailureAnalysisOutput = {
      failureType,
      rootCause: input.error,
      fixRecommendation: 'Inspect application stack trace and configuration values',
      generalizable: false,
      confidence: 0.5,
    };
    this.metrics.recordSuccess(Date.now() - startTime, 40);
    this.cache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  /**
   * Select skills with graceful fallback.
   */
  async selectSkills(input: SkillSelectionInput): Promise<SkillSelectionOutput> {
    const cacheKey = this.cache.computeKey('selectSkills', this.provider.name, input);
    const cached = this.cache.get<SkillSelectionOutput>(cacheKey);
    if (cached) {
      this.metrics.recordCacheHit();
      return cached;
    }
    this.metrics.recordCacheMiss();

    const startTime = Date.now();
    this.metrics.recordCall(Math.ceil(JSON.stringify(input).length / 4));

    if (this.provider.name !== 'none') {
      try {
        const result = await this.provider.selectSkills(input);
        this.metrics.recordSuccess(Date.now() - startTime, 60);
        this.cache.set(cacheKey, result);
        return result;
      } catch {
        this.metrics.recordFallback();
      }
    }

    // Deterministic fallback: match skill names and descriptions against task words
    const taskLower = input.task.toLowerCase();
    const selectedSkillIds: string[] = [];
    const reasoning: Record<string, string> = {};

    for (const skill of input.candidateSkills) {
      const nameWords = skill.name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const descWords = skill.description
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const isMatch =
        taskLower.includes(skill.name.toLowerCase()) ||
        taskLower.includes(skill.description.toLowerCase()) ||
        nameWords.some((w) => taskLower.includes(w)) ||
        descWords.some((w) => taskLower.includes(w));

      if (isMatch) {
        selectedSkillIds.push(skill.id);
        reasoning[skill.id] = `Matches keywords in task`;
      }
    }

    const fallbackResult: SkillSelectionOutput = { selectedSkillIds, reasoning };
    this.metrics.recordSuccess(Date.now() - startTime, 30);
    this.cache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  /**
   * Summarize content with graceful fallback.
   */
  async summarize(input: SummarizationInput): Promise<SummarizationOutput> {
    const cacheKey = this.cache.computeKey('summarize', this.provider.name, input);
    const cached = this.cache.get<SummarizationOutput>(cacheKey);
    if (cached) {
      this.metrics.recordCacheHit();
      return cached;
    }
    this.metrics.recordCacheMiss();

    const startTime = Date.now();
    this.metrics.recordCall(Math.ceil(input.content.length / 4));

    if (this.provider.name !== 'none') {
      try {
        const result = await this.provider.summarize(input);
        this.metrics.recordSuccess(Date.now() - startTime, 60);
        this.cache.set(cacheKey, result);
        return result;
      } catch {
        this.metrics.recordFallback();
      }
    }

    // Deterministic fallback: extract first 3 lines / sentences
    const lines = input.content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 3);

    const fallbackResult: SummarizationOutput = {
      summary: lines.join(' ') || 'Summary unavailable',
      sourceIds: [input.sourceId],
      keyPoints: lines,
    };
    this.metrics.recordSuccess(Date.now() - startTime, 30);
    this.cache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }
}
