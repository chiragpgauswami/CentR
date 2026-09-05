import type { AgentAdapter, AgentRunResult, AgentTaskInput, ExecutionMode } from './types.js';

export class AntigravityAgentAdapter implements AgentAdapter {
  readonly name = 'antigravity';
  readonly supportedModes: ExecutionMode[] = ['automated', 'manual'];

  async runTask(input: AgentTaskInput): Promise<AgentRunResult> {
    const startTime = performance.now();

    if (input.mode === 'manual') {
      // Manual recording mode: records real observed metrics
      return {
        agentName: this.name,
        executionMode: 'manual',
        success: false,
        durationMs: 0,
        toolCalls: 0,
        filesRead: [],
        filesModified: [],
        filesCreated: [],
        toolEvents: [],
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        error:
          'Manual run pending execution. Use "centr benchmark record" to persist observed metrics.',
      };
    }

    // Automated mode: requires headless agy CLI
    const durationMs = performance.now() - startTime;
    return {
      agentName: this.name,
      executionMode: 'unavailable',
      success: false,
      durationMs,
      toolCalls: 0,
      filesRead: [],
      filesModified: [],
      filesCreated: [],
      toolEvents: [],
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      error:
        'Antigravity headless CLI binary ("agy") is not found on PATH. Real agent runs with Antigravity must be executed interactively or recorded with --mode manual.',
    };
  }
}
