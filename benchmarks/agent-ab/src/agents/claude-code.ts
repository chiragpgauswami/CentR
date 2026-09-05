import type { AgentAdapter, AgentRunResult, AgentTaskInput, ExecutionMode } from './types.js';

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly name = 'claude-code';
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

    // Automated mode: check if claude is authenticated
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
        'Claude Code CLI (/usr/local/bin/claude) is installed but not authenticated in this environment. Run "claude auth" or record results using --mode manual.',
    };
  }
}
