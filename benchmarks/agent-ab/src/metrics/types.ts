import type { ExecutionMode } from '../agents/types.js';
import type { ScenarioType } from '../scenarios/types.js';
import type { RetrievalClass, TaskCategory, TaskDifficulty } from '../tasks/types.js';

export interface BenchmarkRunRecord {
  benchmarkVersion: string;
  runId: string;
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  retrievalClass: RetrievalClass;
  difficulty: TaskDifficulty;
  scenario: ScenarioType;
  agent: string;
  executionMode: ExecutionMode;
  model: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  timing?: {
    agentExecutionMs: number | null;
    centrLatencyMs: number | null;
    totalWallClockMs: number;
  };
  success: boolean;
  requiresManualReview: boolean;
  tests: {
    executed: boolean;
    passed: number;
    failed: number;
  };
  agentMetrics: {
    toolCalls: number | null;
    filesRead: number | null;
    filesModified: number;
    filesCreated: number;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    repeatedExplorationCount: number | null;
    patchSizeLines: number;
  };
  centrMetrics: {
    enabled: boolean;
    contextItems?: number;
    contextTokens: number | null;
    latencyMs: number | null;
    candidateCount?: number;
    selectedCount?: number;
    brainCalls: number;
    brainLatencyMs: number;
    cacheHits: number;
    fallbacks: number;
  };
  failureReasons?: string[];
}
