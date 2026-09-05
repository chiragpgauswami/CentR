import type { AgentAdapter, AgentRunResult, AgentTaskInput, ExecutionMode } from './types.js';

export class CursorAdapter implements AgentAdapter {
  readonly name = 'cursor';
  readonly supportedModes: ExecutionMode[] = ['automated', 'manual'];

  async runTask(input: AgentTaskInput): Promise<AgentRunResult> {
    const startTime = performance.now();
    const durationMs = performance.now() - startTime;

    if (input.mode === 'manual') {
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
        'Cursor CLI binary ("cursor") is not installed on this machine. Record external results using --mode manual.',
    };
  }
}
