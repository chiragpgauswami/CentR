# CentR Agent A/B Benchmark Architecture

## 1. Context & Purpose

CentR is a local-first **Project Intelligence + Learning Middleware for AI Coding Agents**. It operates alongside coding agents like Antigravity, Claude Code, Codex CLI, and Cursor.

CentR V1 provided deterministic indexing (AST parsing, SQLite + FTS5 full-text search, exact symbol boosting, token budgeting, project memory, and global learning).
CentR V2 introduced an optional local Small Language Model (SLM) Brain providing task classification, candidate re-ranking, failure diagnosis, and learning extraction.

### The Critical Question

> **Does adding CentR V1 or V2 actually help an AI coding agent complete real software-engineering tasks more correctly, efficiently, and with less unnecessary repository exploration—while consuming acceptable CPU, RAM, and tokens?**

This document specifies the architecture of the **reproducible Agent A/B Benchmark Harness** that answers this question objectively.

---

## 2. Existing System vs New Benchmark Harness

### What Already Exists in the Repository

- **`@centr/core`**:
  - Incremental file indexing (`initializeProject`, `syncProject`).
  - AST symbol parsing with TypeScript compiler API (`parseTypeScript`).
  - SQLite storage with WAL mode and schema migrations (`CentrDatabase`).
  - Multi-source search (`SearchEngine`: FTS5 BM25 + exact symbol boosting).
  - Context engine (`ContextEngine.generate()` for V1, `ContextEngine.generateWithBrain()` for V2).
  - Memory and learning services (`ProjectMemoryService`, `LearningService`, `SkillsService`).
  - Security filtering (`sanitizePath`, `isSecretFile`, `sanitizeForLogging`).
- **`@centr/brain`**:
  - Native local HTTP provider for Ollama (`OllamaProvider`).
  - Hardware detection and profiles (`minimal`, `balanced`, `quality`).
  - Strict candidate-bounded hallucination guards (`validateContextRanking`, `validateSkillSelection`).
  - SHA-256 hash cache with LRU/TTL eviction (`BrainCache`).
  - Telemetry collector (`BrainMetricsCollector`).
  - Testing providers (`MockBrainProvider`, `NullBrainProvider`).
- **`@centr/mcp`**:
  - Stdio JSON-RPC MCP server exposing `project_status`, `project_search`, `project_context` (with `useBrain`), `brain_analyze_failure`, `learning_record`, `learning_search`.
- **`@centr/cli`**:
  - CLI commands: `init`, `sync`, `status`, `search`, `context`, `symbol`, `learn`, `skills`, `doctor`, `benchmark`, `brain`.

### What the Benchmark Harness Adds

1. **Isolated Benchmark Harness** (`benchmarks/agent-ab/`):
   - Standalone execution pipeline independent of production logic.
   - Clean ephemeral workspace isolation per run (no database or file state leakage).
2. **27 Structured Real Coding Tasks**:
   - 7 categories: Authentication/Security (4), API (4), Database (4), Debugging (5), Refactoring (4), Testing (3), Architecture/Unfamiliar (3).
   - 5 retrieval classes: Exact lookup, vocabulary mismatch, architectural constraints, debugging diagnostics, and learning reuse.
3. **Three Explicit Experimental Scenarios**:
   - **Scenario A (Baseline)**: Agent receives raw prompt with standard file tools (no CentR).
   - **Scenario B (CentR V1)**: Agent receives deterministic Core context (Brain disabled).
   - **Scenario C (CentR V2)**: Agent receives Core + local SLM Brain hybrid context and failure diagnosis.
4. **Agent Adapter Interface**:
   - Extensible abstraction (`AgentAdapter`) supporting programmatic and manual recording modes for Generic, Antigravity, Claude Code, Codex, and Cursor.
5. **Objective Multi-Gate Evaluator**:
   - Automated test execution (Vitest / npm test), TypeScript compilation verification (`tsc --noEmit`), ESLint validation, and custom behavioral assertions.
6. **Conservative Repeated Exploration Heuristic**:
   - Tracks file read sequences and search queries to detect redundant exploration loops.
7. **Reporting & Statistical Analysis**:
   - Outputs machine-readable result JSONs (`results/*.json`) and human-readable Markdown comparisons (`reports/latest-report.md`) with a mandatory **"What We Can Actually Claim"** section.

---

## 3. High-Level Architecture Diagram

```text
                               +-----------------------------+
                               |     Benchmark Task Spec     |
                               | (prompt, fixture, tests)    |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |       Run Orchestrator      |
                               | (Creates isolated temp dir) |
                               +--------------+--------------+
                                              |
         +------------------------------------+------------------------------------+
         |                                    |                                    |
         v                                    v                                    v
+------------------+                +------------------+                +------------------+
|   Scenario A     |                |   Scenario B     |                |   Scenario C     |
|   (Baseline)     |                |   (CentR V1)     |                |   (CentR V2)     |
|                  |                |                  |                |                  |
| Raw Task Prompt  |                | Core Indexer     |                | Core Indexer     |
| + Repo Access    |                | + BM25 FTS5      |                | + Local SLM      |
|                  |                | + Token Budget   |                | + Hybrid Ranking |
+--------+---------+                +--------+---------+                +--------+---------+
         |                                   |                                   |
         +-----------------------------------+-----------------------------------+
                                             |
                                             v
                               +-----------------------------+
                               |        Agent Adapter        |
                               | (Generic, Antigravity, etc) |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |     Objective Evaluator     |
                               |  - Automated Tests          |
                               |  - Typecheck & Lint         |
                               |  - Behavioral Assertions    |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |      Metrics Collector      |
                               |  - Success & Duration       |
                               |  - Tool calls & Tokens      |
                               |  - Repeated exploration     |
                               |  - CentR & Brain overhead   |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |    Report & Summary Gen     |
                               |  - latest-report.md         |
                               |  - latest-summary.json      |
                               |  - What We Can Claim        |
                               +-----------------------------+
```

---

## 4. Run Isolation Guarantee

Each benchmark run:

1. Copies base repository fixture to an isolated OS temporary directory (e.g. `/tmp/centr-bench-run-<uuid>`).
2. If scenario is V1 or V2: initializes `.centr/centr.db` and indexes the clean workspace from scratch.
3. Sets up agent adapter environment.
4. Executes task.
5. Runs objective validation suite.
6. Gathers raw metrics, logs, and diff patches.
7. Automatically cleans up temporary directory.

This ensures zero run-to-run cross contamination.
