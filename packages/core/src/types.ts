// Project types
export interface Project {
  id: number;
  name: string;
  rootPath: string;
  language: string;
  framework: string | null;
  packageManager: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// File types
export interface IndexedFile {
  id: number;
  projectId: number;
  path: string;
  relativePath: string;
  language: string;
  size: number;
  hash: string;
  lastIndexed: string;
  isTest: boolean;
  isEntryPoint: boolean;
}

// Symbol types
export interface Symbol {
  id: number;
  fileId: number;
  projectId: number;
  name: string;
  qualifiedName: string;
  kind: SymbolKind;
  signature: string | null;
  line: number;
  endLine: number | null;
  column: number;
  exported: boolean;
}

export type SymbolKind =
  | 'function'
  | 'class'
  | 'method'
  | 'interface'
  | 'type'
  | 'variable'
  | 'constant'
  | 'enum'
  | 'namespace'
  | 'property';

// Import/Export types
export interface ImportRecord {
  id: number;
  fileId: number;
  projectId: number;
  source: string;
  specifiers: string; // JSON array of imported names
  isDefault: boolean;
  isNamespace: boolean;
  line: number;
}

export interface ExportRecord {
  id: number;
  fileId: number;
  projectId: number;
  name: string;
  kind: string;
  isDefault: boolean;
  line: number;
}

// Reference types
export interface Reference {
  id: number;
  fileId: number;
  projectId: number;
  symbolName: string;
  line: number;
  column: number;
}

// Dependency types
export interface Dependency {
  id: number;
  projectId: number;
  name: string;
  version: string;
  isDev: boolean;
  isPeer: boolean;
}

// Route types
export interface Route {
  id: number;
  projectId: number;
  fileId: number;
  method: string;
  path: string;
  handler: string | null;
}

// Project Memory types
export interface ProjectMemory {
  id: number;
  projectId: number;
  title: string;
  content: string;
  category: MemoryCategory;
  source: string;
  confidence: number;
  tags: string; // JSON array
  createdAt: string;
  updatedAt: string;
}

export type MemoryCategory =
  | 'architecture'
  | 'decision'
  | 'constraint'
  | 'discovery'
  | 'api'
  | 'dependency'
  | 'workflow'
  | 'warning';

// Global Learning types
export interface Learning {
  id: number;
  lesson: string;
  category: string;
  trigger: string;
  recommendedAction: string;
  confidence: number;
  scope: string;
  status: LearningStatus;
  sourceExperience: string;
  createdAt: string;
  updatedAt: string;
}

export type LearningStatus = 'candidate' | 'validated' | 'rejected';

export interface LearningEvidence {
  id: number;
  learningId: number;
  experience: string;
  outcome: 'success' | 'failure';
  context: string;
  createdAt: string;
}

// Skill types
export interface Skill {
  id: number;
  name: string;
  description: string;
  trigger: string;
  instructions: string;
  category: string;
  confidence: number;
  source: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
}

// Session types
export interface Session {
  id: number;
  projectId: number;
  task: string | null;
  status: 'active' | 'completed' | 'abandoned';
  context: string; // JSON
  createdAt: string;
  updatedAt: string;
}

// Index metadata
export interface IndexMetadata {
  id: number;
  projectId: number;
  key: string;
  value: string;
  updatedAt: string;
}

// Context types
export interface ContextRequest {
  task: string;
  projectId: number;
  maxTokens?: number;
  includeMemory?: boolean;
  includeLearning?: boolean;
  includeSkills?: boolean;
  useBrain?: boolean;
}

export interface ContextItem {
  type: 'file' | 'symbol' | 'memory' | 'learning' | 'skill' | 'dependency';
  name: string;
  content: string;
  relevance: number;
  tokens: number;
  source: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface ContextResult {
  items: ContextItem[];
  estimatedTokens: number;
  budget: number;
  itemsSelected: number;
  itemsRemoved: number;
  task: string;
  generatedAt: string;
}

// Search types
export interface SearchResult {
  file: string;
  symbol?: string;
  line?: number;
  type: string;
  relevance: number;
  excerpt: string;
  language?: string;
}

export interface SearchOptions {
  query: string;
  projectId: number;
  limit?: number;
  types?: string[];
  json?: boolean;
}

// Config types
export interface CentrConfig {
  database: { path: string };
  ignore: { patterns: string[]; secretPatterns: string[] };
  context: { maxTokens: number; defaultBudget: number };
  search: { maxResults: number; minRelevance: number };
  learning: { autoPromote: boolean; promotionThreshold: number; minEvidence: number };
  brain: {
    enabled: boolean;
    provider: string | null;
    model?: string;
    profile?: 'minimal' | 'balanced' | 'quality';
    endpoint?: string;
    timeoutMs?: number;
    maxInputTokens?: number;
    maxOutputTokens?: number;
    maxConcurrentRequests?: number;
  };
  logging: { level: 'debug' | 'info' | 'warn' | 'error' };
}

// Sync types
export interface SyncResult {
  filesAdded: number;
  filesChanged: number;
  filesDeleted: number;
  filesUnchanged: number;
  symbolsUpdated: number;
  timeTaken: number;
}

// Doctor types
export interface DoctorCheck {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  fix?: string;
}

// Benchmark types
export interface BenchmarkResult {
  name: string;
  indexingTimeMs: number;
  searchLatencyMs: number;
  contextLatencyMs: number;
  estimatedTokens: number;
  selectedFiles: number;
  selectedSymbols: number;
  excludedItems: number;
}
