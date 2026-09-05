# CentR Real-Agent A/B Benchmark Harness

A scientific, reproducible benchmark harness to objectively evaluate whether **CentR V1** (deterministic intelligence layer) and **CentR V2** (hybrid Core + local SLM Brain) actually improve AI coding agents (Antigravity, Claude Code, Codex, Cursor) on real software engineering tasks.

---

## 1. Overview

The benchmark harness tests coding agents across **three scenarios**:

1. **Scenario A (Baseline)**: Agent receives task prompt and repository access with standard tools (`view_file`, `grep_search`, `find_by_name`, `replace_file_content`), without CentR.
2. **Scenario B (CentR V1)**: Agent receives task prompt plus CentR V1 deterministic context (AST symbol indexing, SQLite + FTS5 full-text search, token budgeting, project memory, and global learning; Brain disabled).
3. **Scenario C (CentR V2)**: Agent receives task prompt plus CentR V2 hybrid context (Core retrieval + local Brain semantic re-ranking, candidate scoring, and failure diagnosis).

### Evaluated Metrics

- **Task Success**: Passes automated tests (`npm test`), TypeScript verification (`tsc --noEmit`), expected file outputs, and required patterns.
- **Completion Duration**: Wall-clock time (ms) to complete the task.
- **Tool Calls**: Total number of agent tool invocations.
- **Exploration Suppression**: Count of redundant file reads (3+ repeated reads without edits) and duplicate search queries.
- **Token Efficiency**: Agent input/output tokens consumed vs. CentR context tokens provided.
- **CentR Overhead**: Retrieval and local SLM inference latency and memory footprint.

---

## 2. 27-Task Benchmark Dataset

The dataset contains 27 realistic coding tasks across 7 categories and 5 retrieval classes:

| Category                      | Tasks | Difficulty    | Retrieval Difficulty Class                |
| :---------------------------- | :---: | :------------ | :---------------------------------------- |
| **Authentication & Security** |   4   | Easy - Hard   | Exact symbol & Vocabulary mismatch        |
| **API Changes**               |   4   | Easy - Hard   | Exact symbol & Architectural context      |
| **Database & Migrations**     |   4   | Easy - Hard   | Architectural context & Learning reuse    |
| **Debugging & Errors**        |   5   | Easy - Hard   | Runtime diagnostics & Vocabulary mismatch |
| **Refactoring & Cleanup**     |   4   | Easy - Medium | Architectural context & Exact symbol      |
| **Testing & Coverage**        |   3   | Easy - Medium | Exact symbol & Architectural context      |
| **Architecture & Unfamiliar** |   3   | Medium - Hard | Multi-module constraints & Learning reuse |

---

## 3. Hardware Requirements & Matrix

| Profile               | Recommended RAM | Recommended Model | Minimum CPU                                       |
| :-------------------- | :-------------- | :---------------- | :------------------------------------------------ |
| **Minimal** (Default) | 8 GB            | `qwen2.5:1.5b`    | 4-core CPU (Intel/AMD or Apple M1/M2/M3)          |
| **Balanced**          | 16 GB           | `llama3.2:3b`     | 8-core CPU or Apple Silicon unified memory        |
| **Quality**           | 32+ GB          | `qwen2.5:7b`      | Dedicated GPU (VRAM >= 8GB) or Apple M-series Max |

_Note: In environments without Ollama or GPU acceleration, CentR V2 automatically falls back to deterministic V1 ranking with 0 runtime errors._

---

## 4. Quick Start & Reproduction Steps

### Step 1: Clone and Install

```bash
git clone <repo-url> centr
cd centr
npm install
```

### Step 2: Build All Packages

```bash
npm run build
```

### Step 3: Run Unit & Scenario Tests

```bash
npm test
```

### Step 4: Run the 3-Task Smoke Benchmark (9 Runs)

```bash
# Using the standalone benchmark CLI:
npm run benchmark:agents -- --smoke

# Or using the CentR CLI:
node packages/cli/dist/index.js benchmark agents --smoke
```

### Step 5: View Generated Smoke Report

```bash
cat benchmarks/agent-ab/reports/latest-report.md
```

### Step 6: Run a Specific Task

```bash
# Run task 'auth-001' across all 3 scenarios
node packages/cli/dist/index.js benchmark agents --task auth-001

# Run task 'database-001' specifically on CentR V2
node packages/cli/dist/index.js benchmark agents --task database-001 --scenario centr-v2
```

### Step 7: Compare Aggregate Benchmark Results

```bash
node packages/cli/dist/index.js benchmark compare
```

### Step 8: View Summary Report in JSON

```bash
node packages/cli/dist/index.js benchmark report --json
```

---

## 5. CLI Command Reference

### `centr benchmark agents`

Executes automated agent runs across scenarios:

- `--task <id>`: Filter by specific task ID (e.g. `auth-001`, `database-001`).
- `--scenario <type>`: `baseline`, `centr-v1`, or `centr-v2`. (Default: runs all 3).
- `--agent <name>`: `generic`, `antigravity`, `claude-code`, `codex`, or `cursor`. (Default: `generic`).
- `--mode <mode>`: `automated`, `manual`, or `simulated`. (Default: `automated`).
- `--runs <n>`: Repetitions per scenario for statistical confidence (Default: `1`).
- `--smoke`: Run 3-task validation set (`auth-001`, `database-001`, `debugging-001`).
- `--json`: Output JSON summary to stdout.

### `centr benchmark record`

Manually record an external agent session into the benchmark dataset:

```bash
node packages/cli/dist/index.js benchmark record \
  --task auth-001 \
  --scenario centr-v2 \
  --agent antigravity \
  --duration 2450 \
  --tool-calls 3 \
  --tokens 1280 \
  --success
```

### `centr benchmark report`

Generate markdown and JSON reports from all saved results:

```bash
node packages/cli/dist/index.js benchmark report
```

### `centr benchmark compare`

Display side-by-side delta tables comparing Baseline vs V1 vs V2:

```bash
node packages/cli/dist/index.js benchmark compare
```

---

---

## 6. Real-Agent Execution Guide & Protocol

CentR strictly distinguishes between **three distinct benchmark tiers**:

| Benchmark Tier                          | Execution Mode                           | Purpose                                                                                               | Valid Claims                                                                                |
| :-------------------------------------- | :--------------------------------------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| **Tier 1: Infrastructure Smoke**        | `simulated` (`GenericAgentAdapter`)      | Validates runner pipelines, isolation, multi-gate evaluation, and report generation in ~15ms.         | Code paths, JSON schemas, isolation integrity. (Does **not** claim real agent improvement). |
| **Tier 2: Retrieval & Latency Profile** | `automated` (Deterministic Core & Brain) | Evaluates CentR FTS5/AST retrieval latency, token budget adherence, and local SLM overhead.           | Sub-2ms V1 retrieval, bounded context size, zero cloud token leaks.                         |
| **Tier 3: Real-Agent Benchmark**        | `automated` / `manual` (Real Agents)     | Measures actual coding agents (Antigravity, Claude Code, Codex, Cursor) modifying clean repositories. | True agent wall clock, actual tool count reduction, real git patches, test pass rates.      |

### Agent Adapter Audit Status

| Agent           |       Real Execution       |            Automated            |         Tool Capture         |      Token Capture      | Status in Current Environment                                                          |
| :-------------- | :------------------------: | :-----------------------------: | :--------------------------: | :---------------------: | :------------------------------------------------------------------------------------- |
| **Generic**     |             No             |         Yes (simulated)         | Simulated (synthetic events) |   Null (no fake math)   | **Simulated infrastructure harness** for pipeline testing.                             |
| **Antigravity** | **Yes** (session/subagent) |   No (no headless CLI `agy`)    |  **Observed** (in session)   | Null (unexposed by API) | **Available via live session / protocol recording**.                                   |
| **Claude Code** |  Yes (when authenticated)  | No (unauthenticated in sandbox) |         Unavailable          |       Unavailable       | `/usr/local/bin/claude` installed, but unauthenticated. **Manual protocol supported.** |
| **Codex**       |             No             |               No                |         Unavailable          |       Unavailable       | `codex` CLI not found on PATH. **Unavailable.**                                        |
| **Cursor**      |             No             |               No                |         Unavailable          |       Unavailable       | `cursor` CLI not found on PATH. **Unavailable.**                                       |

### Step-by-Step Real-Agent Execution Protocol

To execute a scientifically controlled real-agent benchmark:

1. **Prepare Clean Isolated Fixtures**:
   Clone or copy the target fixture at a clean git commit into isolated workspaces for Baseline, CentR V1, and CentR V2:

   ```bash
   mkdir -p fixtures/real-runs/baseline fixtures/real-runs/centr-v1 fixtures/real-runs/centr-v2
   ```

2. **Generate CentR Context (for V1 and V2)**:

   ```bash
   # CentR V1 Deterministic Context
   node packages/cli/dist/index.js context "Task description" --project fixtures/real-runs/centr-v1 --no-brain

   # CentR V2 Hybrid Semantic Context
   node packages/cli/dist/index.js context "Task description" --project fixtures/real-runs/centr-v2
   ```

3. **Execute the Agent**:
   - **Baseline**: Supply the raw prompt and repository access.
   - **CentR V1 / V2**: Supply the task prompt prefixed with the generated CentR context.

4. **Verify Objective Gates**:

   ```bash
   npx vitest run <isolated-dir>/tests/validation.test.ts
   git -C <isolated-dir> diff --stat
   ```

5. **Record Observed Metrics**:
   ```bash
   node packages/cli/dist/index.js benchmark record \
     --task <task-id> \
     --scenario <baseline|centr-v1|centr-v2> \
     --agent <antigravity|claude-code|codex|cursor> \
     --duration <wall-clock-ms> \
     --tool-calls <observed-tools> \
     --success
   ```

---

## 7. Run Isolation Guarantee

To eliminate state leakage across runs:

1. Each task execution copies the clean repository fixture into an isolated, ephemeral directory (`/tmp/centr-bench-run-<uuid>-*/`).
2. An isolated CentR database (`.centr/centr.db`) is initialized from scratch for scenarios B and C.
3. Upon task completion and evaluation, the isolated workspace is completely purged.
4. Fixtures and existing repository branches are never modified during benchmark execution.
