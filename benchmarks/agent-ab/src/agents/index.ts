export * from './antigravity.js';
export * from './claude-code.js';
export * from './codex.js';
export * from './cursor.js';
export * from './generic.js';
export * from './types.js';

import { AntigravityAgentAdapter } from './antigravity.js';
import { ClaudeCodeAdapter } from './claude-code.js';
import { CodexAdapter } from './codex.js';
import { CursorAdapter } from './cursor.js';
import { GenericAgentAdapter } from './generic.js';
import type { AgentAdapter } from './types.js';

export function getAgentAdapter(name: string): AgentAdapter {
  switch (name) {
    case 'generic':
      return new GenericAgentAdapter();
    case 'antigravity':
      return new AntigravityAgentAdapter();
    case 'claude-code':
      return new ClaudeCodeAdapter();
    case 'codex':
      return new CodexAdapter();
    case 'cursor':
      return new CursorAdapter();
    default:
      throw new Error(
        `Unsupported agent adapter: ${name}. Supported: generic, antigravity, claude-code, codex, cursor`,
      );
  }
}
