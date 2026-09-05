# Claude Code + CentR Integration

CentR provides project intelligence to Claude Code via the Model Context Protocol (MCP).

## Setup

### 1. Initialize CentR in your project

```bash
cd your-project
centr init
```

### 2. Configure Claude Code MCP

Add CentR to your Claude Code MCP configuration.

Create or edit `.claude/mcp.json` in your project:

```json
{
  "mcpServers": {
    "centr": {
      "command": "node",
      "args": ["path/to/centr/packages/mcp/dist/index.js"],
      "cwd": "."
    }
  }
}
```

Or if CentR is installed globally:

```json
{
  "mcpServers": {
    "centr": {
      "command": "centr-mcp",
      "cwd": "."
    }
  }
}
```

### 3. Verify connection

```bash
centr doctor
```

Check that the MCP configuration status shows "ok".

## Available MCP Tools

Once connected, Claude Code can use these tools:

| Tool | Description |
|------|-------------|
| `project_status` | Get project overview (files, symbols, dependencies) |
| `project_search` | Search code, symbols, and files |
| `project_context` | Generate task-relevant context with token budgeting |
| `project_symbol` | Look up a specific symbol |
| `project_dependencies` | List or search dependencies |
| `project_architecture` | Get architecture overview |
| `learning_search` | Search engineering lessons |
| `learning_record` | Record a new lesson |
| `skill_search` | Search development skills |

## How It Works

1. Claude Code sends a task description to `project_context`
2. CentR returns only the relevant files, symbols, memories, and learning
3. Claude Code uses this focused context instead of exploring the entire repository
4. After completing work, Claude Code can record lessons via `learning_record`

## Benefits

- **Reduced exploration**: CentR provides relevant context upfront, reducing file-by-file exploration
- **Token efficiency**: Context is budgeted to minimize token usage
- **Persistent memory**: Project decisions and architecture are remembered across sessions
- **Learning**: Engineering lessons are captured and reused

## Keeping CentR in Sync

Run `centr sync` periodically or after significant code changes:

```bash
centr sync
```

This incrementally updates the index without full re-indexing.

## Best Practices

- Initialize CentR before starting a Claude Code session
- Keep the index up to date with `centr sync`
- Record important project decisions as project memory
- Let validated learning accumulate naturally over time
- Do NOT inject full project context into every session prompt
- Use on-demand retrieval via MCP tools

## Privacy

CentR runs entirely locally. No project data is sent to external services.
The MCP server communicates only with Claude Code via stdio.
