# CentR Testing & Quality Assurance Guide

This document describes the testing strategy, test suites, and validation methodology for CentR.

---

## 1. Testing Philosophy

- **High Coverage**: Critical modules (AST parsing, path security, database migrations, token budgeting, MCP stdio protocol) are tested under strict edge conditions.
- **No Mock Databases**: Database tests execute against real SQLite databases in temporary directories with full foreign keys, transactions, and FTS5 enabled.
- **Subprocess Integration**: Network and stdio communication layers are verified as actual spawned processes to validate protocol cleanliness and frame formatting.

---

## 2. Test Suite Overview

| Test Suite             | Package / Path | Focus Area                                                                                                       |
| :--------------------- | :------------- | :--------------------------------------------------------------------------------------------------------------- |
| `parser.test.ts`       | `@centr/core`  | AST extraction, comments/string false positive exclusion, multiline imports, arrow functions, references         |
| `security.test.ts`     | `@centr/core`  | Path traversal attacks, sibling prefix attacks, content secret scanning, input sanitization                      |
| `discovery.test.ts`    | `@centr/core`  | Gitignore parsing, symlink cycle prevention, language detection, secret filtering                                |
| `storage.test.ts`      | `@centr/core`  | SQLite WAL mode, foreign keys, `PRAGMA user_version` sync, UNIQUE constraints                                    |
| `indexer.test.ts`      | `@centr/core`  | Full project indexing, incremental sync, idempotent re-initialization                                            |
| `search.test.ts`       | `@centr/core`  | BM25 weighted ranking across 5 sources, symbol lookup, dependency search                                         |
| `context.test.ts`      | `@centr/core`  | Token budgeting, explainable `reason` generation, tight budget eviction                                          |
| `memory.test.ts`       | `@centr/core`  | Project memory CRUD, FTS search, category tagging                                                                |
| `learning.test.ts`     | `@centr/core`  | Evidence recalculation, promotion thresholds, duplicate prevention, 8-step simulated agent workflow              |
| `skills.test.ts`       | `@centr/core`  | Skills registry, trigger matching, FTS search                                                                    |
| `mcp.test.ts`          | `@centr/mcp`   | MCP tool execution in-process (`project_status`, `project_context`, `learning_record`, etc.)                     |
| `stdio.test.ts`        | `@centr/mcp`   | True child-process stdio JSON-RPC protocol validation                                                            |
| `cli.test.ts`          | `@centr/cli`   | CLI commands (`init`, `sync`, `status`, `search`, `context`, `symbol`, `learn`, `skills`, `doctor`, `benchmark`) |
| `brain.test.ts`        | `@centr/brain` | Brain provider interface, null provider, deterministic classifier/ranker                                         |
| `v2.test.ts`           | `@centr/brain` | Hardware detection, hallucination guards, cache TTL/LRU, metrics, Ollama client, 21-step lifecycle test          |
| `ab-benchmark.test.ts` | `@centr/brain` | Agent A/B comparative benchmark: V1 deterministic context vs V2 hybrid context                                   |

---

## 3. Running the Tests

```bash
# Run all tests once
npm test

# Run tests with watch mode
npx vitest

# Run tests for a specific package
npx vitest run packages/brain/tests/v2.test.ts

# Run tests with code coverage
npx vitest run --coverage
```

---

## 4. Quality Gates Checklist

Before any PR or release:

1. `npm run typecheck`: TypeScript compiles with zero errors across all workspaces (`tsc -b`).
2. `npm run lint`: ESLint passes with zero warnings.
3. `npm test`: All 17 test files and 150+ tests pass 100%.

4. `npm run build`: Monorepo build produces clean ESM artifacts in `dist/`.
