# Codex CLI + CentR Integration

CentR provides project intelligence to OpenAI Codex CLI via the Model Context Protocol (MCP).

## Setup

### 1. Initialize CentR in your project

```bash
cd your-project
centr init
```

### 2. Configure Codex MCP

Add CentR to your Codex MCP configuration.

Create or edit your Codex configuration to include the CentR MCP server:

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

### 3. Verify connection

```bash
centr doctor
```

## Available MCP Tools

The same MCP tools available for Claude Code are available for Codex:

| Tool | Description |
|------|-------------|
| `project_status` | Get project overview |
| `project_search` | Search code, symbols, and files |
| `project_context` | Generate task-relevant context |
| `project_symbol` | Look up a specific symbol |
| `project_dependencies` | List or search dependencies |
| `project_architecture` | Get architecture overview |
| `learning_search` | Search engineering lessons |
| `learning_record` | Record a new lesson |
| `skill_search` | Search development skills |

## How It Works

CentR uses the same MCP server for all integrations. The intelligence layer is the same regardless of which coding agent is connected.

1. Codex sends a task to `project_context`
2. CentR returns focused, relevant context
3. Codex uses this context to complete the task
4. After work, lessons can be recorded via `learning_record`

## Notes

- CentR runs entirely locally
- No project data is sent to external services
- The same learning and memory is shared across all connected agents
- Keep the index current with `centr sync`
