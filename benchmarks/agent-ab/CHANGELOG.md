# CentR Changelog

All notable changes to the CentR project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-09-05

### Added
- **Deterministic Core Layer (`@centr-ai/core`)**:
  - Full AST-based TypeScript/JavaScript parsing via TypeScript Compiler API (`ts.createSourceFile`).
  - Extracted symbol definitions: functions, classes, methods, interfaces, types, enums, variables, constants.
  - Multi-source full-text search with SQLite 3 (WAL mode) and FTS5 BM25 ranked indexing.
  - Incremental sync engine computing SHA-256 content hashes to re-index changed files in sub-10ms.
- **Context Engine & Token Budgeting**:
  - Greedy relevance sorting with deterministic character token estimation (`1 token ≈ 4 chars`).
  - Configurable token budgets (`--max-tokens`) preventing agent context overflow.
- **Project Memory**:
  - Persistent, project-isolated institutional knowledge categorized into architecture, decisions, constraints, discoveries, APIs, dependencies, workflows, and warnings.
- **Global Learning**:
  - Cross-project evidence-based learning lifecycle (`candidate` → `evidence` → `confidence` → `validated` / `rejected`).
  - Mathematical confidence scoring based on observed success/failure ratios.
- **Model Context Protocol (`@centr-ai/mcp`)**:
  - stdio JSON-RPC MCP server exposing `get_context`, `search_code`, `lookup_symbol`, `get_memory`, `record_memory`, and `get_learning`.
- **Command Line Interface (`@centr-ai/cli`)**:
  - Full CLI tooling (`centr init`, `sync`, `status`, `search`, `context`, `symbol`, `memory`, `learn`, `skills`, `doctor`, `benchmark`).
- **Security & Privacy Layer**:
  - Path traversal defense (`sanitizePath`).
  - Comprehensive secret detection and redaction patterns (`DEFAULT_SECRET_PATTERNS`, `SECRET_CONTENT_PATTERNS`).
  - Zero cloud telemetry by default.
- **Optional Local Brain (`@centr-ai/brain`)**:
  - Local SLM integration (Ollama `qwen2.5:1.5b`, `llama3.2:3b`, `qwen2.5:7b`).
  - Context re-ranking with strict Core candidate bounding (hallucination guard).
  - Task classification, failure analysis, memory extraction, and summarization.
  - Hardware-aware resource profiling (Minimal, Balanced, Quality) and graceful deterministic fallback.
- **Real-Agent A/B Benchmark Harness (`@centr-ai/benchmark-ab`)**:
  - Scientific 3-tier benchmark system (Tier 1: Infrastructure Smoke, Tier 2: Retrieval Latency, Tier 3: Real Agent Execution).
  - 27-task software engineering dataset across 7 categories and 5 retrieval classes.
  - 21 preliminary interactive runs on Google Antigravity (Gemini 2.5 Pro) with 100% test success. Preliminary observations showed fewer exploratory tool calls in tested scenarios; agent token telemetry was unobserved and results are preliminary.
