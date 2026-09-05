import type { ScenarioContext } from '../scenarios/types.js';

export type ExecutionMode = 'automated' | 'manual' | 'simulated' | 'unavailable';

export interface AgentToolEvent {
  tool: string;
  target?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AgentTaskInput {
  taskId: string;
  taskPrompt: string;
  scenario: ScenarioContext;
  workingDir: string;
  timeoutMs?: number;
  mode?: ExecutionMode;
}

export interface AgentRunResult {
  agentName: string;
  executionMode: ExecutionMode;
  success: boolean;
  durationMs: number;
  toolCalls: number;
  filesRead: string[];
  filesModified: string[];
  filesCreated: string[];
  toolEvents: AgentToolEvent[];
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  patch?: string;
  error?: string;
}

export interface AgentAdapter {
  readonly name: string;
  readonly supportedModes: ExecutionMode[];
  runTask(input: AgentTaskInput): Promise<AgentRunResult>;
}
