import type { ContextResult } from '@centr/core';

export type ScenarioType = 'baseline' | 'centr-v1' | 'centr-v2';

export interface ScenarioContext {
  type: ScenarioType;
  centrEnabled: boolean;
  brainEnabled: boolean;
  contextResult?: ContextResult;
  centrLatencyMs?: number;
  centrTokens?: number;
  brainMetrics?: {
    calls: number;
    latencyMs: number;
    cacheHits: number;
    fallbacks: number;
  };
}

export interface ScenarioPreparer {
  readonly type: ScenarioType;
  prepare(
    workspaceDir: string,
    taskPrompt: string,
    options?: { brainProvider?: string; brainProfile?: string },
  ): Promise<ScenarioContext>;
}
