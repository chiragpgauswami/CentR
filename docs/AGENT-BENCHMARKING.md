# CentR Real-Agent A/B Benchmarking: Methodology & Protocol

## 1. Purpose & Empirical Motivation

AI coding agents (such as Google Antigravity, Anthropic Claude Code, OpenAI Codex, and Cursor) often face significant friction when entering an unfamiliar codebase:

1. They perform repeated, exhaustive directory scans (`find_by_name`, `grep_search`).
2. They re-read the same configuration or utility files repeatedly across turns.
3. They burn context tokens reading irrelevant modules due to vocabulary mismatches.
4. They repeat errors previously diagnosed and solved in the project.

**CentR** is designed as a local-first **Project Intelligence + Learning Middleware** that runs beside these agents.

### The Objective Question

Does CentR actually make AI coding agents faster, more accurate, and more token-efficient, while using acceptable local hardware resources?

To answer this without bias or vendor hype, CentR provides an automated, reproducible **Agent A/B Benchmark Harness**.

---

## 2. Experimental Scenarios

Every benchmark task is evaluated across three controlled scenarios:

```
┌─────────────────────────────────────────────────────────────┐
│                   EXPERIMENTAL MATRIX                       │
├───────────────────┬─────────────────────────────────────────┤
│ Scenario A        │ Baseline: Raw agent prompt + file tools │
│ (Baseline)        │ No CentR context, no memory, no Brain   │
├───────────────────┼─────────────────────────────────────────┤
│ Scenario B        │ CentR V1: Deterministic Core context    │
│ (Deterministic)   │ AST symbols, FTS5 BM25, Memory, Learn   │
│                   │ Brain disabled, 0 LLM latency overhead  │
├───────────────────┼─────────────────────────────────────────┤
│ Scenario C        │ CentR V2: Hybrid Core + local SLM Brain │
│ (Hybrid Brain)    │ Core candidate retrieval + SLM ranking  │
│                   │ Failure diagnosis + memory extraction   │
└───────────────────┴─────────────────────────────────────────┘
```

---

## 3. Benchmark Dataset Structure

The benchmark suite defines **27 realistic software engineering tasks** classified into 5 difficulty classes based on retrieval complexity:

### Class 1: Exact Symbol Match

- **Description**: The task explicitly mentions exact symbol names or file paths (e.g. `UserController`, `auth.service.ts`).
- **Hypothesis**: CentR V1's deterministic FTS5 index retrieves the target symbols with near-zero latency (~1ms), making V1 competitive with or superior to V2.

### Class 2: Vocabulary Mismatch

- **Description**: The prompt describes a symptom or concept without using the project's exact variable or function naming (e.g., "enforce replay protection" for a function named `verifyToken`).
- **Hypothesis**: V1's keyword search may rank tangential files higher; CentR V2's semantic re-ranking correctly identifies the relevant modules on the first turn.

### Class 3: Architectural Context

- **Description**: Changes requiring cross-module knowledge (e.g. database migration rules, route registration patterns, error handling conventions).
- **Hypothesis**: CentR's Project Memory and architectural relationship graph provide required multi-file context that prevents the agent from making breaking changes.

### Class 4: Debugging & Diagnostics

- **Description**: Diagnosing and fixing an error stack trace or runtime failure.
- **Hypothesis**: CentR V2's `analyzeFailure` provider pinpoints root causes and suggests targeted repairs, avoiding blind grep exploration.

### Class 5: Learning Reuse

- **Description**: Applying past project learnings or validated team practices.
- **Hypothesis**: CentR Global Learning supplies validated lessons directly in context, preventing the agent from repeating previously documented mistakes.

---

## 4. Run Isolation & Hygiene Protocol

To guarantee scientific validity and prevent cross-run state pollution:

1. **Isolated Ephemeral Workspaces**: For every single run, `createIsolatedWorkspace()` copies the repository fixture into an isolated temporary directory in the OS temp directory (`/tmp/centr-bench-run-<uuid>-*/`).
2. **Fresh Database Per Run**: For Scenarios B and C, a new SQLite database (`.centr/centr.db`) is initialized from scratch. No state is inherited from previous task runs.
3. **Automatic Cleanup**: Upon task conclusion, all ephemeral directories and temporary databases are deleted.
4. **Zero Cloud Tokens**: CentR V1 and V2 operate strictly local-first. V2 connects exclusively to local inference (e.g., Ollama `http://127.0.0.1:11434` or internal test mocks), ensuring zero remote API calls.

---

## 5. Metrics Pipeline & Objective Evaluation

### Multi-Gate Objective Evaluator

Task success is never determined by LLM self-reporting. Instead, `ObjectiveEvaluator` enforces four objective gates:

1. **Automated Test Suite**: Executes project unit/integration tests (e.g. `npm test -- validation.test.ts`).
2. **Typecheck & Lint Verification**: Verifies zero TypeScript syntax or type errors (`tsc --noEmit`).
3. **Expected File Existence**: Confirms generated or moved files exist at specified paths.
4. **Pattern Matching**: Asserts that required implementation patterns are present and forbidden patterns (e.g. mock bypasses, secrets) are absent.

### Conservative Repeated Exploration Heuristic

Redundant exploration is tracked objectively using the following conservative heuristic:

- **Redundant File Read**: A file is flagged as redundantly explored if read **3 or more times consecutively without any intervening modification or edit**.
- **Duplicate Search**: A search or grep query is flagged if executed **2 or more times with identical search parameters**.

---

## 6. Interpreting the Benchmark Results

When reviewing `reports/latest-report.md` or running `centr benchmark compare`, look at the paired deltas:

### 1. Tool Call Delta (`Tool Calls Diff`)

- **Negative value (`-1.7`)**: CentR reduced the number of tool calls the agent had to perform, saving time and tokens.
- **Zero or positive value**: CentR did not reduce tool calls for this task type.

### 2. Repeated Exploration Delta (`Repeated Diff`)

- Demonstrates whether supplying upfront context suppressed exploration loops.

### 3. Duration Delta (`Duration Diff`)

- Note: CentR V2 introduces local SLM inference time (~10-25ms with mock/accelerated SLM, or 200-800ms with CPU-only Llama 3.2). CentR V2 is justified when the reduction in agent turns and token consumption outweighs the local inference latency.

---

## 7. Benchmark Tiers: Simulation vs Retrieval vs Real Agents

To guarantee scientific rigor, CentR strictly partitions benchmarking into three tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CENTR 3-TIER BENCHMARK SYSTEM                         │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ Tier 1: Smoke /   │ • Fast automated CI smoke tests (~15ms per run)         │
│ Simulation        │ • Validates workspace isolation & metric pipeline       │
│                   │ • Uses GenericAgentAdapter (synthetic events)           │
│                   │ • Transparently labeled in all reports                  │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Tier 2: Retrieval │ • Evaluates AST indexing and FTS5 BM25 search (< 2ms)   │
│ & Latency Profile │ • Measures CentR token budgets & candidate ranking      │
│                   │ • Verifies local SLM overhead and zero cloud tokens     │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Tier 3: Real      │ • Real autonomous agents (Antigravity, Claude, Codex)   │
│ Agent Execution   │ • Modifies actual clean repository files                │
│                   │ • Evaluated by Vitest unit tests and git diff stat      │
│                   │ • Captures observed wall clock & real tool invocations  │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

### Metric Classification & Honesty Rules

CentR enforces strict data provenance on all reported metrics:

- `wall_clock_duration`: **Observed** via system timestamps around agent execution.
- `task_success`: **Observed** via automated Vitest test gate execution.
- `tool_calls`: **Observed** from real agent turn events; reported as `simulated` in mock runs.
- `files_read` / `files_modified`: **Observed** via filesystem audit and `git diff`.
- `agent_tokens`: **Unavailable** (`null`) when not directly exposed by the agent API; **never fabricated**.
- `centr_context_tokens`: **Observed** via CentR deterministic token estimator.
- `centr_latency_ms`: **Observed** via `performance.now()`.

---

## 8. What We Can Actually Claim

A non-negotiable principle of CentR is absolute intellectual honesty in reporting:

### Supported Claims:

- Supplying task-relevant context via CentR reduces blind exploratory tool calls (`find_by_name`, `grep_search`) on the agent's first turn.
- In our first verified real-agent test (`auth-001`), Antigravity required **6 tool calls** under Baseline vs **4 tool calls** under CentR V1 and V2 (a 33% reduction in exploration actions), with 100% test success across all scenarios.
- CentR V1 adds negligible retrieval overhead (< 2ms) with zero cloud dependencies.
- CentR V2 candidate re-ranking is bounded by Core retrieval; hallucination guards strictly prune ungrounded candidates.
- Fallback mechanisms guarantee zero runtime crashes when local SLMs are unavailable or unresponsive.

### Claims CentR Explicitly Avoids:

- CentR does NOT claim "agents never need to explore files."
- CentR does NOT claim simulated smoke test tool reductions represent real-world agent performance.
- CentR does NOT claim V2 is faster than V1 on simple exact-symbol queries.
- CentR does NOT claim local SLMs beat cloud frontier models at generalized reasoning; rather, they serve as specialized, privacy-preserving context ranking filters.
