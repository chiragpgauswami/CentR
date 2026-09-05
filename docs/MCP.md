# CentR Model Context Protocol (MCP) Integration

CentR provides a production-ready **Model Context Protocol (MCP)** server via `@centr-ai/mcp`, allowing AI coding agents such as **Claude Code**, **OpenAI Codex**, and **Cursor** to query project intelligence, memory, and learnings seamlessly over standard I/O (stdio).

---

## 1. Exposed MCP Tools

The CentR MCP server exposes the following structured tools:

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `get_context` | `task: string`, `maxTokens?: number` | Generates token-bounded context (symbols, files, memory, validated learnings) for a specific coding task. |
| `search_code` | `query: string`, `limit?: number` | Performs ranked full-text BM25 search across indexed symbols and file paths. |
| `lookup_symbol` | `name: string` | Retrieves full definition, signature, file location, references, and related imports for a symbol. |
| `get_memory` | `query?: string`, `category?: string` | Searches or lists project-isolated institutional memories. |
| `record_memory` | `title: string`, `content: string`, `category: string` | Saves a new architectural decision, discovery, or constraint into project memory. |
| `get_learning` | `query: string`, `validatedOnly?: boolean` | Searches cross-project validated lessons and recommended actions. |

---

## 2. Configuration for AI Coding Agents

### A. Claude Code Integration

Add CentR to your Claude Code configuration:

```bash
# Global configuration
claude mcp add centr -- npx @centr-ai/mcp

# Or direct CLI invocation
claude mcp add centr -- node /path/to/centr/packages/mcp/dist/index.js
```

In your `~/.claude/claude.json` or `.mcp.json`:

```json
{
  "mcpServers": {
    "centr": {
      "command": "centr-mcp",
      "args": []
    }
  }
}
```

### B. Cursor IDE Integration

Add CentR to your Cursor settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "centr": {
      "command": "node",
      "args": ["./node_modules/@centr-ai/mcp/dist/index.js"]
    }
  }
}
```

### C. Codex CLI / OpenCode

In your agent runner or configuration file:

```json
{
  "tools": {
    "centr": {
      "type": "mcp",
      "command": "centr-mcp",
      "transport": "stdio"
    }
  }
}
```

---

## 3. How the MCP Server Operates

```text
AI Coding Agent (Claude Code, Codex, Cursor)
                     │
                     ▼ (JSON-RPC over stdio)
             @centr-ai/mcp Server
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    Core Context            Core Storage
  (Token Budgeter)        (SQLite 3 + FTS5)
```

1. **Sub-5ms Execution**: Tool invocations execute against the local in-process SQLite database with sub-5ms latency.
2. **Zero Telemetry**: All data remains strictly on your local filesystem.
3. **Graceful Fallback**: If optional local Brain services are unavailable, the MCP server answers using deterministic Core FTS5 and AST indexes with zero errors.
