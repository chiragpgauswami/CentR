# @centr-ai/core

<p align="center">
  <img src="https://raw.githubusercontent.com/chiragpgauswami/CentR/main/assets/logo.svg" width="480" alt="CentR Logo" />
</p>

<p align="center">
  <strong>Local-first Project Intelligence & Memory Middleware for AI Coding Agents</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@centr-ai/core"><img src="https://img.shields.io/npm/v/@centr-ai/core.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@centr-ai/core"><img src="https://img.shields.io/npm/dm/@centr-ai/core.svg" alt="npm downloads" /></a>
  <a href="https://github.com/chiragpgauswami/CentR/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/typescript-strict-3178C6.svg" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node >= 20" />
  <img src="https://img.shields.io/badge/tests-298%20passed-10B981.svg" alt="Tests 298 passed" />
  <img src="https://img.shields.io/badge/telemetry-zero%20cloud-06B6D4.svg" alt="Zero Cloud Telemetry" />
</p>

<p align="center">
  <a href="https://chiragpgauswami.github.io/CentR/"><strong>Documentation Website</strong></a> •
  <a href="https://github.com/chiragpgauswami/CentR"><strong>GitHub Repository</strong></a> •
  <a href="https://chiragpgauswami.github.io/CentR/docs/architecture.html"><strong>Architecture Guide</strong></a> •
  <a href="https://chiragpgauswami.github.io/CentR/docs/mcp.html"><strong>MCP Setup</strong></a>
</p>

---

## ⚡ What is `@centr-ai/core`?

`@centr-ai/core` is the deterministic foundation and programmatic SDK of **CentR**. It provides **local-first project intelligence, incremental AST code indexing, SQLite 3 + FTS5 full-text search, token-budgeted context assembly, and persistent institutional memory** for AI coding agents and developer tooling.

It transforms a raw repository into an indexed, queryable intelligence layer that enables agents to target the exact files, symbols, and constraints they need on their first turn—without blind file tree traversal or unbounded grep scans.

> **Core Slogan**: _"Store everything useful. Send almost nothing."_

---

## 🎯 Why Project Intelligence for AI Coding Agents?

### The Problem: Context Waste & Repeated Exploration

When AI coding agents (Claude Code, Cursor, Codex, Antigravity, or custom agent loops) interact with codebases, they routinely burn **2 to 4 exploratory tool calls** and thousands of context tokens on every user prompt:

- Grepping for function declarations across hundreds of source files.
- Searching directory trees to locate route handlers, types, or configuration files.
- Re-discovering the same architectural conventions, decisions, and constraints on every session.
- Stuffing raw file dumps into LLM prompt windows, diluting model attention and risking token exhaustion.

### The Solution: Deterministic Repository Intelligence

`@centr-ai/core` solves this locally in under 2 milliseconds:

1. **Indexes Once**: Performs incremental AST parsing of TypeScript, JavaScript, JSON, and Markdown into structured symbols (functions, classes, interfaces, types), imports, exports, and dependencies.
2. **Embeds in SQLite FTS5**: Maintains local, WAL-mode SQLite databases with BM25 ranked full-text indexing.
3. **Packs Context to Budget**: Analyzes incoming agent tasks, retrieves top candidate symbols and memories, and greedily selects content to strictly fit a specified token budget (e.g. 4,000 tokens).
4. **Remembers Institutional Knowledge**: Stores project-specific architectural decisions, security rules, and warnings so agents do not repeat past mistakes.

---

## 📦 Key Capabilities

- ⚡ **Incremental AST Code Indexing**: Parses symbols, imports, exports, and routes with SHA-256 content change detection. Typical incremental sync takes **~20ms**.
- 🔍 **SQLite 3 + FTS5 BM25 Code Search**: Multi-source ranked retrieval across symbol identifiers, qualified paths, files, and project memory.
- 🎯 **Token-Budgeted Context Engineering**: Deterministic character-to-token budgeting (`fitToBudget`) that selects highest-priority items and evicts low-relevance content to strictly respect context window limits.
- 🧠 **Project Memory & Global Learning**: Local SQLite storage for project decisions, constraints, and warnings (`ProjectMemoryService`), plus cross-project evidence-backed knowledge (`LearningService`).
- 🛡️ **Zero-Cloud & Privacy First**: Operates 100% locally with zero cloud telemetry. Built-in security scanners automatically redact `.env`, certificates, tokens, and private keys.
- 🧩 **ESM & Strict TypeScript**: Native ECMAScript Modules (`NodeNext`) with full TypeScript type definitions and strict mode compliance.

---

## 💻 Installation

```bash
npm install @centr-ai/core
```

### System Requirements:

- **Node.js**: `>= 20.0.0`
- **Operating System**: macOS, Linux, Windows (via native Node.js and precompiled `better-sqlite3` bindings)
- **Module System**: ESM (`import { ... } from '@centr-ai/core'`)

---

## 🚀 Quick Start & Code Examples

### 1. Initialize Database & Index a Codebase

```typescript
import { CentrDatabase, initializeProject } from '@centr-ai/core';

// Open or create the local SQLite database
const db = new CentrDatabase('./.centr/centr.db');
db.initialize();

// Index the current project (extracts symbols, imports, exports, dependencies)
const result = await initializeProject(process.cwd(), db);

console.log(`Project: ${result.project.name} (${result.project.language})`);
console.log(
  `Indexed ${result.filesIndexed} files and ${result.symbolsIndexed} symbols in ${result.timeTaken}ms`,
);
```

---

### 2. Generate Token-Budgeted Context for an AI Agent

Give your coding agent the exact symbols and context it needs for a specific prompt within a strict token budget:

```typescript
import { CentrDatabase, ContextEngine } from '@centr-ai/core';

const db = new CentrDatabase('./.centr/centr.db');
db.initialize();

const contextEngine = new ContextEngine(db);

// Generate budgeted context for an agent task
const context = contextEngine.generate({
  projectId: 1,
  task: 'Implement JWT authentication middleware and token refresh route',
  maxTokens: 4000,
  includeMemory: true,
  includeLearning: true,
});

console.log(`Task: "${context.task}"`);
console.log(`Budget: ${context.budget} tokens | Estimated: ${context.estimatedTokens} tokens`);
console.log(`Selected: ${context.itemsSelected} items | Evicted: ${context.itemsRemoved} items`);

// Inject context.items directly into your LLM system prompt
for (const item of context.items) {
  console.log(
    `[${item.type}] ${item.name} (relevance: ${item.relevance.toFixed(2)}, tokens: ${item.tokens})`,
  );
}
```

---

### 3. Fast Full-Text & Symbol Search with SQLite FTS5

```typescript
import { CentrDatabase, SearchEngine } from '@centr-ai/core';

const db = new CentrDatabase('./.centr/centr.db');
db.initialize();

const search = new SearchEngine(db);

// 1. Multi-source ranked BM25 search
const results = search.search({
  projectId: 1,
  query: 'verifyToken',
  limit: 5,
});

for (const res of results) {
  console.log(
    `${res.type}: ${res.file}${res.line ? `:${res.line}` : ''} (score: ${res.relevance.toFixed(2)})`,
  );
}

// 2. Deep symbol inspection (definition, file location, references, and related imports)
const symbolDetail = search.lookupSymbol(1, 'AuthService');
if (symbolDetail) {
  console.log(`Symbol: ${symbolDetail.symbol.name} (${symbolDetail.symbol.kind})`);
  console.log(`File: ${symbolDetail.file.relativePath}:${symbolDetail.symbol.line}`);
  console.log(`Incoming References: ${symbolDetail.references.length}`);
}
```

---

### 4. Manage Institutional Project Memory

Store architectural patterns, conventions, and warnings that agents should respect:

```typescript
import { CentrDatabase, ProjectMemoryService } from '@centr-ai/core';

const db = new CentrDatabase('./.centr/centr.db');
db.initialize();

const memory = new ProjectMemoryService(db);

// Store an architectural constraint
const entry = memory.create({
  projectId: 1,
  title: 'Password Hashing Standard',
  content:
    'Always use bcrypt with minimum 12 salt rounds for user password hashes. Never use SHA-256 for passwords.',
  category: 'constraint',
  source: 'security-audit',
  confidence: 1.0,
  tags: ['auth', 'security', 'passwords'],
});

console.log(`Created memory #${entry.id}: ${entry.title}`);

// Query memories with SQLite FTS5
const hits = memory.search(1, 'bcrypt salt rounds');
console.log(`Found ${hits.length} relevant memories`);
```

---

### 5. Incremental Synchronization

When files are modified, re-index only the changed files in milliseconds:

```typescript
import { CentrDatabase, syncProject } from '@centr-ai/core';

const db = new CentrDatabase('./.centr/centr.db');
db.initialize();

// Computes SHA-256 hashes and re-indexes only modified/new files
const syncResult = await syncProject(1, process.cwd(), db);

console.log(`Sync complete in ${syncResult.timeTaken}ms:`);
console.log(
  `Added: ${syncResult.filesAdded} | Changed: ${syncResult.filesChanged} | Deleted: ${syncResult.filesDeleted}`,
);
```

---

## 🏛️ Public API Overview

| Export                 | Type     | Description                                                                                       |
| :--------------------- | :------- | :------------------------------------------------------------------------------------------------ |
| `CentrDatabase`        | Class    | SQLite 3 database manager with WAL mode, foreign keys, and schema migrations.                     |
| `initializeProject`    | Function | Scans codebase, parses AST symbols, redacts secrets, and builds initial index.                    |
| `syncProject`          | Function | Incremental re-indexer using SHA-256 content hashes (~20ms).                                      |
| `ContextEngine`        | Class    | Assembles and token-budgets task-relevant context items from code and memory.                     |
| `SearchEngine`         | Class    | Multi-source BM25 full-text search across symbols, paths, and memories.                           |
| `ProjectMemoryService` | Class    | CRUD and FTS5 search for project-scoped institutional memories and constraints.                   |
| `LearningService`      | Class    | Evidence-based global learning registry with confidence scoring and status promotion.             |
| `SkillsService`        | Class    | Registry of reusable developer routines and skills with trigger matching.                         |
| `estimateTokens`       | Function | Deterministic character-to-token approximation (1 token ≈ 4 characters).                          |
| `fitToBudget`          | Function | Greedy relevance-ordered token budgeting algorithm.                                               |
| `parseTypeScript`      | Function | Regex/AST parser extracting functions, classes, methods, interfaces, types, imports, and exports. |
| `sanitizePath`         | Function | Path traversal defense ensuring all file operations stay within the project root.                 |
| `isSecretFile`         | Function | Automated scanner detecting `.env`, private keys, certificates, and credentials.                  |

---

## 🌐 The CentR Ecosystem

`@centr-ai/core` is part of the CentR monorepo suite designed for AI coding agents and developer workflows:

| Package                                                                              | Purpose                            | When to Use                                                                                             |
| :----------------------------------------------------------------------------------- | :--------------------------------- | :------------------------------------------------------------------------------------------------------ |
| **`@centr-ai/core`**                                                                 | **Core Intelligence Engine & SDK** | Building custom agents, context pipelines, or embedding project intelligence into Node.js apps.         |
| **[`@centr-ai/cli`](https://www.npmjs.com/package/@centr-ai/cli)**                   | **Command Line Interface**         | Human developers using `centr init`, `centr context`, `centr search`, and `centr doctor` in terminal.   |
| **[`@centr-ai/mcp`](https://www.npmjs.com/package/@centr-ai/mcp)**                   | **Model Context Protocol Server**  | Connecting CentR directly to **Claude Code**, **Cursor**, and **Codex** via native stdio MCP.           |
| **[`@centr-ai/brain`](https://www.npmjs.com/package/@centr-ai/brain)**               | **Optional Local SLM Advisor**     | Semantic re-ranking and automated learning extraction using local Ollama models with zero cloud tokens. |
| **[`@centr-ai/benchmark-ab`](https://www.npmjs.com/package/@centr-ai/benchmark-ab)** | **Agent A/B Benchmark Harness**    | Measuring coding agent tool-call reduction and task latency under controlled scenarios.                 |

---

## 🔒 Security & Secret Redaction

CentR enforces a strict local-first security boundary:

- **Zero Remote Calls**: Never sends code, tokens, or queries to external cloud servers.
- **Built-in Secret Exclusion**: Excludes `.env`, `.pem`, `.key`, `id_rsa`, `token.json`, and credentials before AST parsing.
- **Path Traversal Protection**: All paths are resolved and validated within `rootPath` via `sanitizePath`.
- **Parameterized SQL**: All SQLite queries use parameterized placeholders (`?`) to prevent SQL injection.

---

## 📚 Documentation & Resources

- **Website**: [https://chiragpgauswami.github.io/CentR/](https://chiragpgauswami.github.io/CentR/)
- **Documentation**: [https://chiragpgauswami.github.io/CentR/docs/getting-started.html](https://chiragpgauswami.github.io/CentR/docs/getting-started.html)
- **Architecture Deep Dive**: [https://chiragpgauswami.github.io/CentR/docs/architecture.html](https://chiragpgauswami.github.io/CentR/docs/architecture.html)
- **MCP Integration Guide**: [https://chiragpgauswami.github.io/CentR/docs/mcp.html](https://chiragpgauswami.github.io/CentR/docs/mcp.html)
- **GitHub Repository**: [https://github.com/chiragpgauswami/CentR](https://github.com/chiragpgauswami/CentR)
- **Issues & Support**: [https://github.com/chiragpgauswami/CentR/issues](https://github.com/chiragpgauswami/CentR/issues)

---

## 📄 License

MIT © 2024–2026 CentR Contributors. See [LICENSE](https://github.com/chiragpgauswami/CentR/blob/main/LICENSE) for details.
