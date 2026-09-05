/**
 * CentR Brain V2 - Domain Types and Provider Interfaces
 */

export type ResourceProfile = 'minimal' | 'balanced' | 'quality';

export interface ProfileConfig {
  profile: ResourceProfile;
  model: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  timeoutMs: number;
  maxConcurrentRequests: number;
}

export const PROFILE_PRESETS: Record<ResourceProfile, ProfileConfig> = {
  minimal: {
    profile: 'minimal',
    model: 'qwen2.5:1.5b',
    maxInputTokens: 1024,
    maxOutputTokens: 256,
    timeoutMs: 10000,
    maxConcurrentRequests: 1,
  },
  balanced: {
    profile: 'balanced',
    model: 'llama3.2:3b',
    maxInputTokens: 2048,
    maxOutputTokens: 512,
    timeoutMs: 15000,
    maxConcurrentRequests: 1,
  },
  quality: {
    profile: 'quality',
    model: 'qwen2.5:7b',
    maxInputTokens: 4096,
    maxOutputTokens: 1024,
    timeoutMs: 30000,
    maxConcurrentRequests: 2,
  },
};

export interface HardwareInfo {
  os: string;
  arch: string;
  totalMemoryGb: number;
  availableMemoryGb?: number;
  cpuCores: number;
  isAppleSilicon: boolean;
  hasGpu: boolean;
  gpuName?: string;
}

export interface HardwareRecommendation {
  hardware: HardwareInfo;
  recommendedProfile: ResourceProfile;
  recommendedModels: string[];
  rationale: string;
}

export interface BrainCapabilities {
  supportedTasks: Array<
    | 'classifyTask'
    | 'rankContext'
    | 'extractLearning'
    | 'analyzeFailure'
    | 'selectSkills'
    | 'summarize'
  >;
  maxContextTokens: number;
  supportsStreaming: boolean;
  supportsJsonFormat: boolean;
}

// 1. Task Classification
export interface TaskClassificationInput {
  task: string;
  projectContext?: string;
}

export interface TaskClassificationOutput {
  category: string;
  subcategories: string[];
  entities: string[];
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  suggestedDomains: string[];
}

// 2. Context Ranking
export interface CandidateContextItem {
  id: string;
  type: 'file' | 'symbol' | 'memory' | 'learning' | 'skill' | 'dependency';
  name: string;
  content: string;
  deterministicScore: number;
}

export interface ContextRankingInput {
  task: string;
  candidates: CandidateContextItem[];
  maxTokens?: number;
}

export interface ContextRankingItem {
  id: string;
  score: number;
  reason: string;
}

export interface ContextRankingOutput {
  items: ContextRankingItem[];
  reasoning?: string;
}

// 3. Learning Extraction
export interface LearningExtractionInput {
  task: string;
  attempt: string;
  result: 'failure' | 'success';
  error?: string;
  fix?: string;
  validation?: string;
}

export interface LearningExtractionOutput {
  lesson: string;
  category: string;
  trigger: string;
  recommendedAction: string;
  confidence: number;
  generalizable: boolean;
  evidence: string[];
}

// 4. Failure Analysis
export interface FailureAnalysisInput {
  task: string;
  attemptedChange: string;
  error: string;
  testOutput?: string;
  fixAttempted?: string;
}

export interface FailureAnalysisOutput {
  failureType:
    | 'configuration'
    | 'syntax'
    | 'type_error'
    | 'logic'
    | 'environment'
    | 'permission'
    | 'dependency'
    | 'other';
  rootCause: string;
  fixRecommendation: string;
  generalizable: boolean;
  lessonCandidate?: string;
  confidence: number;
}

// 5. Skill Selection
export interface CandidateSkill {
  id: string;
  name: string;
  description: string;
  trigger?: string;
}

export interface SkillSelectionInput {
  task: string;
  candidateSkills: CandidateSkill[];
}

export interface SkillSelectionOutput {
  selectedSkillIds: string[];
  reasoning: Record<string, string>;
}

// 6. Summarization
export interface SummarizationInput {
  content: string;
  sourceId: string;
  maxSummaryTokens?: number;
  purpose?: string;
}

export interface SummarizationOutput {
  summary: string;
  sourceIds: string[];
  keyPoints: string[];
}

// Provider Interface
export interface BrainProvider {
  readonly name: string;
  isReady(): Promise<boolean>;
  capabilities(): BrainCapabilities;
  listModels(): Promise<string[]>;
  classifyTask(input: TaskClassificationInput): Promise<TaskClassificationOutput>;
  rankContext(input: ContextRankingInput): Promise<ContextRankingOutput>;
  extractLearning(input: LearningExtractionInput): Promise<LearningExtractionOutput>;
  analyzeFailure(input: FailureAnalysisInput): Promise<FailureAnalysisOutput>;
  selectSkills(input: SkillSelectionInput): Promise<SkillSelectionOutput>;
  summarize(input: SummarizationInput): Promise<SummarizationOutput>;
  complete?(prompt: string, options?: Record<string, unknown>): Promise<string>;
  embed?(text: string): Promise<number[]>;
}

// Typed Errors
export class BrainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public override readonly cause?: Error,
  ) {
    super(message);
    this.name = 'BrainError';
  }
}

export class BrainUnavailableError extends BrainError {
  constructor(message = 'Brain provider is unavailable or offline', cause?: Error) {
    super(message, 'BRAIN_UNAVAILABLE', cause);
    this.name = 'BrainUnavailableError';
  }
}

export class BrainTimeoutError extends BrainError {
  constructor(timeoutMs: number, cause?: Error) {
    super(`Brain request timed out after ${timeoutMs}ms`, 'BRAIN_TIMEOUT', cause);
    this.name = 'BrainTimeoutError';
  }
}

export class BrainInvalidResponseError extends BrainError {
  constructor(details: string, cause?: Error) {
    super(
      `Brain returned invalid or unparseable response: ${details}`,
      'BRAIN_INVALID_RESPONSE',
      cause,
    );
    this.name = 'BrainInvalidResponseError';
  }
}

export class BrainModelNotFoundError extends BrainError {
  constructor(model: string, cause?: Error) {
    super(`Brain model "${model}" was not found or is not pulled`, 'BRAIN_MODEL_NOT_FOUND', cause);
    this.name = 'BrainModelNotFoundError';
  }
}

export class BrainResourceLimitError extends BrainError {
  constructor(message: string, cause?: Error) {
    super(message, 'BRAIN_RESOURCE_LIMIT', cause);
    this.name = 'BrainResourceLimitError';
  }
}

export class BrainProviderError extends BrainError {
  constructor(message: string, cause?: Error) {
    super(message, 'BRAIN_PROVIDER_ERROR', cause);
    this.name = 'BrainProviderError';
  }
}
