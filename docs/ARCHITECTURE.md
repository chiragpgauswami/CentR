# CentR Architecture

## System Overview

CentR is designed as a modular, local-first middleware for AI coding agents. It orchestrates AST parsing, incremental indexing, memory management, and context generation to provide coding agents with the exact, minimal information they need, when they need it.

```text
       +-------------------+       +--------------------+
       |   Coding Agent    |       |  LLM Provider      |
       | (Claude, Codex)   |       | (Optional: Brain)  |
       +---------+---------+       +---------+----------+
                 |                           |
+----------------v---------------------------v----------------+
|                           CentR                             |
|  +--------+  +--------+  +---------+                        |
|  |  CLI   |  |  MCP   |  |  Brain  |                        |
|  +----+---+  +----+---+  +----+----+                        |
|       |           |           |                             |
|  +----v-----------v-----------v--------------------------+  |
|  |                        Core                           |  |
|  |  +---------+ +--------+ +---------+ +--------------+  |  |
|  |  | Indexer | | Parser | | Search  | | Context      |  |  |
|  |  +---------+ +--------+ +---------+ +--------------+  |  |
|  |  +---------+ +--------+ +---------+ +--------------+  |  |
|  |  | Memory  | | Learn  | | Skills   | | Security     |  |  |
|  |  +---------+ +--------+ +---------+ +--------------+  |  |
|  +----+--------------------------------------------------+  |
+-------|-----------------------------------------------------+
        |
+-------v-------+
|    Storage    |
| (SQLite+FTS5) |
+---------------+
```

## Package Descriptions

- **core**: The central logic layer. Contains all modules for parsing, indexing, search, memory, learning, skills, security, and SQLite storage.
- **cli**: Command-line interface (`centr`) exposing subcommands: `init`, `sync`, `status`, `search`, `symbol`, `context`, `learn`, `skills`, `doctor`, `benchmark`.
- **mcp**: Model Context Protocol stdio server integration exposing tools (`project_status`, `project_search`, `project_context`, `project_symbol`, `project_dependencies`, `learning_record`, `learning_search`, etc.) for Claude Code, Codex, and Cursor.
- **brain**: Optional abstraction layer for local and remote LLMs (embeddings and learning pattern synthesis). Core CentR functionality operates 100% offline without requiring `brain`.

## Core Module Descriptions

- **indexer**: Orchestrates file discovery, SHA-256 change detection, AST parsing, dependency mapping, and SQLite transactions.
- **parser**: Uses TypeScript's official AST compiler API (`ts.createSourceFile`) to extract functions, arrow functions, classes, methods, accessors, interfaces, type aliases, enums, multiline imports, exports, and identifier references without comment or string false positives.
- **search**: Multi-source search engine with weighted BM25 ranking across FTS5 virtual tables and exact symbol boosting.
- **context**: Generates budgeted prompt context items tagged with explainable relevance reasons.
- **memory**: Manages project-specific architectural decisions, constraints, discoveries, and workflow conventions.
- **learning**: Manages evidence-based global learning patterns with confidence scoring and automated promotion thresholds.
- **skills**: Manages task execution skills and reusable prompt instructions.
- **security**: Enforces boundary sanitization (`path.relative`), secret file filtering, regex content scanning, symlink cycle detection, and log redaction.
- **storage**: Manages SQLite with WAL mode, foreign keys, transaction rollbacks, schema migrations, and `PRAGMA user_version`.
- **config**: Manages `.centr/config.json` configuration and directory initialization.

## Database Schema Overview

The local SQLite database (`.centr/centr.db`) uses the following core schema:

- `projects`: id, name, rootPath (UNIQUE), language, framework, packageManager, description, timestamps.
- `files`: id, projectId, path, relativePath, language, size, hash, lastIndexed, isTest, isEntryPoint, UNIQUE(projectId, path).
- `symbols`: id, fileId, projectId, name, qualifiedName, kind, signature, line, endLine, column, exported.
- `imports`: id, fileId, projectId, source, specifiers, isDefault, isNamespace, line.
- `exports`: id, fileId, projectId, name, kind, isDefault, line.
- `references_table`: id, fileId, projectId, symbolName, line, column.
- `dependencies`: id, projectId, name, version, isDev, isPeer.
- `routes`: id, projectId, fileId, method, path, handler.
- `project_memory`: id, projectId, title, content, category, source, confidence, tags.
- `learning`: id, lesson, category, trigger, recommendedAction, confidence, scope, status, sourceExperience.
- `learning_evidence`: id, learningId, experience, outcome, context.
- `skills`: id, name, description, trigger, instructions, category, confidence, source, scope.
- `sessions`: id, projectId, task, status, context.
- `index_metadata`: id, projectId, key, value.

### FTS5 Virtual Tables:

- `files_fts`: Full-text search over relative paths.
- `symbols_fts`: Full-text search over symbol names, qualified names, and signatures.
- `memory_fts`: Full-text search over memory titles, contents, and tags.
- `learning_fts`: Full-text search over lesson texts, triggers, and actions.
- `skills_fts`: Full-text search over skill names, descriptions, triggers, and instructions.

## Memory Architecture

CentR strictly separates memory into two distinct tiers:

1. **Project Memory**: Specific to a single repository. Stored locally in `.centr/centr.db`. Contains repository-specific conventions, decisions, and constraints.
2. **Global Learning**: General insights across development experiences. Backed by evidence records (`learning_evidence`), starting as `candidate` lessons with confidence calculated from historical success/failure outcomes, promoted to `validated` when confidence exceeds 0.7.

## Context Engine Pipeline

1. **Keyword Extraction**: Extracts significant keywords from task description.
2. **Code Retrieval**: BM25 FTS search across files and AST symbols + exact symbol lookup.
3. **Memory & Learning Retrieval**: Queries relevant project memories and validated global lessons.
4. **Dependency Resolution**: Surfaces matching dependencies for task keywords.
5. **Relevance Explanation**: Attaches an explainable `reason` string to each candidate item.
6. **Token Budgeting**: Fits items greedily according to relevance score into the requested token ceiling (e.g. 1000, 2000, 4000 tokens).

## Brain Architecture (CentR V2)

CentR V2 adds an optional, local-first Small Language Model (SLM) Brain designed to reason over candidates retrieved by Core:

- **Local Providers**: Primary native HTTP client for Ollama (`http://127.0.0.1:11434`), `MockBrainProvider` for testing/benchmarking, and `NullBrainProvider` for fallback.
- **Hardware-Aware Profiles**:
  - `minimal` (< 6GB RAM): `qwen2.5:1.5b` (1024 token limit, 10s timeout).
  - `balanced` (8–12GB RAM): `llama3.2:3b` (2048 token limit, 15s timeout).
  - `quality` (16GB+ RAM): `qwen2.5:7b` (4096 token limit, 30s timeout).
- **Candidate-Bounded Reasoning**: The Brain never ingests repository trees; it only receives pre-filtered candidate sets (10–30 items) from Core.
- **Strict Hallucination Guards**: Prunes any identifiers, file paths, or skill IDs not present in the original candidate input.
- **Hybrid Context Scoring**: Combines deterministic and semantic ranking:
  $$\text{Score} = 0.5 \times \text{Deterministic Score} + 0.5 \times \text{Brain Score}$$
  Exact symbol matches maintain guaranteed priority.
- **Deterministic Hash Cache**: Hash-keyed LRU/TTL cache accelerates repeated agent turns to < 1 ms.
- **Graceful Fallback**: 100% transparent fallback to deterministic Core on timeouts, invalid JSON, or offline daemon.

## Security Model

- **Local-First**: All data is stored locally in `.centr/centr.db`. Zero cloud dependency.
- **Zero Telemetry**: No telemetry or remote reporting.
- **Secret Filtering**: Excludes credentials, private keys, tokens, and certificates by filename and content inspection.
- **Path Traversal Protection**: Enforces strict `path.relative` boundaries.
- **Symlink Cycle Guard**: Tracks canonical directory paths to prevent recursion loops.
- **SQL Injection Defenses**: 100% parameterized queries.
- **Brain Read-Only Sandbox**: Brain operates strictly as a read-only context ranker/analyzer; cannot execute shell commands or write files directly.
