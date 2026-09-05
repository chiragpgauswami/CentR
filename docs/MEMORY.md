# CentR Project Memory Architecture

> **"Memory answers: What happened in this project?"**

Project Memory provides persistent, project-isolated institutional knowledge for AI coding agents. It prevents repeated discovery of architectural decisions, historical bugs, performance constraints, and conventions.

---

## 1. Core Principles of Project Memory

1. **Project Isolation**: Memories recorded for Project A are stored in Project A's local SQLite database (`.centr/centr.db`) and are **never leaked** to other projects or cross-boundary repositories.
2. **Deterministic Retrieval**: Memories are indexed using SQLite FTS5 full-text search with BM25 ranking, ensuring sub-millisecond retrieval without requiring cloud embeddings.
3. **Structured Categories**: Every memory is classified into an explicit category with confidence scoring and searchable tags.
4. **Token Bounded**: The Context Engine selects the most relevant memories within the configured token budget, pruning low-relevance entries.

---

## 2. Memory Categories

| Category | Purpose | Example |
| :--- | :--- | :--- |
| `architecture` | Structural patterns, layering, component contracts | *"All database access must go through DatabaseService, never direct SQL in controllers."* |
| `decision` | Rationale for technology choices or trade-offs | *"Using bcrypt with 12 salt rounds per Security Policy RFC-104."* |
| `constraint` | Environmental, memory, or hardware limitations | *"Worker processes must not exceed 256MB RAM due to container limits."* |
| `discovery` | Non-obvious nuances discovered during development | *"The auth token expiry must account for 60s clock skew on distributed clients."* |
| `api` | Contract details, routing patterns, header requirements | *"All POST endpoints require an Idempotency-Key header."* |
| `dependency` | Third-party package quirks or version lock requirements | *"Do not upgrade better-sqlite3 past 11.x until node-gyp build issue is resolved."* |
| `workflow` | CI/CD, testing, or migration procedures | *"Run migrations in a dry-run transaction before applying in staging."* |
| `warning` | Known anti-patterns, traps, or deprecated methods | *"Never use eval() or Function constructor when parsing JSON config."* |

---

## 3. Storage Schema (SQLite + FTS5)

```sql
CREATE TABLE IF NOT EXISTS project_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
  title,
  content,
  tags,
  content='project_memory',
  content_rowid='id'
);
```

---

## 4. CLI & MCP Operations

### Via CentR CLI:
```bash
# Add a memory
centr memory add --title "Token Revocation" --category architecture --content "Revocation blacklist stored in memory with TTL"

# Search memories
centr memory search "token revocation"

# List all memories
centr memory list
```

### Via Model Context Protocol (MCP):
AI coding agents (Claude Code, Codex, Cursor) invoke the `get_context` or `search_code` tools. The Context Engine automatically retrieves and scores relevant memories against the agent's task prompt.

---

## 5. Memory vs. Learning: The Distinction

| Dimension | Project Memory (`docs/MEMORY.md`) | Global Learning (`docs/LEARNING.md`) |
| :--- | :--- | :--- |
| **Scope** | **Project-isolated** (never leaves project `.centr/`) | **Cross-project** (shared developer learnings) |
| **Question** | *"What happened in this specific repository?"* | *"What should the agent do differently next time?"* |
| **Validation** | Immediately active upon creation | Requires candidate $\rightarrow$ evidence $\rightarrow$ validation lifecycle |
| **Storage** | Project SQLite database | Global CentR learning database (`~/.centr/learning.db`) |
