import {
  BrainCapabilities,
  BrainProvider,
  BrainUnavailableError,
  ContextRankingInput,
  ContextRankingOutput,
  FailureAnalysisInput,
  FailureAnalysisOutput,
  LearningExtractionInput,
  LearningExtractionOutput,
  SkillSelectionInput,
  SkillSelectionOutput,
  SummarizationInput,
  SummarizationOutput,
  TaskClassificationInput,
  TaskClassificationOutput,
} from '../types.js';

export class NullBrainProvider implements BrainProvider {
  readonly name = 'none';

  capabilities(): BrainCapabilities {
    return {
      supportedTasks: [],
      maxContextTokens: 0,
      supportsStreaming: false,
      supportsJsonFormat: false,
    };
  }

  async isReady(): Promise<boolean> {
    return false;
  }

  async listModels(): Promise<string[]> {
    return [];
  }

  async classifyTask(_input: TaskClassificationInput): Promise<TaskClassificationOutput> {
    throw new BrainUnavailableError('No Brain provider configured');
  }

  async rankContext(_input: ContextRankingInput): Promise<ContextRankingOutput> {
    throw new BrainUnavailableError('No Brain provider configured');
  }

  async extractLearning(_input: LearningExtractionInput): Promise<LearningExtractionOutput> {
    throw new BrainUnavailableError('No Brain provider configured');
  }

  async analyzeFailure(_input: FailureAnalysisInput): Promise<FailureAnalysisOutput> {
    throw new BrainUnavailableError('No Brain provider configured');
  }

  async selectSkills(_input: SkillSelectionInput): Promise<SkillSelectionOutput> {
    throw new BrainUnavailableError('No Brain provider configured');
  }

  async summarize(_input: SummarizationInput): Promise<SummarizationOutput> {
    throw new BrainUnavailableError('No Brain provider configured');
  }

  async complete(_prompt: string): Promise<string> {
    return '';
  }

  async embed(_text: string): Promise<number[]> {
    return [];
  }
}
