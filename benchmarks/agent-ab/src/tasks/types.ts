export type TaskCategory =
  | 'authentication'
  | 'security'
  | 'api'
  | 'database'
  | 'debugging'
  | 'refactoring'
  | 'testing'
  | 'architecture';

export type RetrievalClass =
  | 'class_1_exact'
  | 'class_2_vocabulary_mismatch'
  | 'class_3_architectural_context'
  | 'class_4_debugging'
  | 'class_5_learning_reuse';

export type TaskDifficulty = 'easy' | 'medium' | 'hard';

export interface TaskValidation {
  commands?: string[];
  expectedFiles?: string[];
  forbiddenStrings?: Array<{ file: string; pattern: string }>;
  requiredStrings?: Array<{ file: string; pattern: string }>;
  customValidator?: string;
}

export interface BenchmarkTask {
  id: string;
  category: TaskCategory;
  retrievalClass: RetrievalClass;
  title: string;
  difficulty: TaskDifficulty;
  prompt: string;
  repositoryFixture: string;
  expectedBehavior: string[];
  relevantFiles: string[];
  relevantSymbols?: string[];
  relevantMemoryKeys?: string[];
  validation: TaskValidation;
  metrics: {
    primary: string;
  };
}
