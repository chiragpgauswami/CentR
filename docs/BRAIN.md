# CentR V2: Local Small Language Model (SLM) Brain

CentR V2 introduces an optional, local-first Small Language Model (SLM) Brain designed to augment CentR's deterministic intelligence layer with semantic reasoning, task classification, intelligent context re-ranking, automated failure analysis, and grounded learning extraction.

---

## Core Product Philosophy & Invariants

The Brain is an **enhancement**, NOT a replacement for CentR Core. It strictly adheres to these non-negotiable invariants:

1. **100% Optional**: CentR operates with full functionality using pure deterministic heuristics and SQLite FTS5 if the Brain is disabled or offline.
2. **Zero Cloud Dependencies**: The Brain executes strictly locally (e.g. through local Ollama at `http://127.0.0.1:11434`). No external API keys or network calls are required.
3. **Low Resource Footprint**: Built primarily for low-end developer hardware (from 4GB RAM laptops to 16GB+ workstations) using quantized SLMs (0.5B to 7B parameters).
4. **Candidate-Bounded Reasoning**: The Brain NEVER receives full repositories or unbounded context windows. Core deterministically retrieves candidate subsets (top 10–30 items), and the Brain reasons ONLY over these candidate sets.
5. **Strict Hallucination Protection**: Brain responses undergo strict schema validation and candidate ID verification. The Brain cannot invent file paths, symbol identifiers, or skill names. Any ungrounded identifiers are automatically pruned.
6. **Deterministic Fallback Guarantee**: If the local LLM times out, crashes, produces unparseable output, or is offline, CentR seamlessly and silently falls back to deterministic Core algorithms. Operations never crash or block agent workflows.
7. **Read-Only / Non-Autonomous**: The Brain never executes terminal commands or edits source files directly. It acts strictly as middleware context intelligence for AI coding agents.

---

## Hardware Profiles & Model Matrix

CentR V2 automatically inspects system RAM, CPU cores, GPU acceleration, and OS architecture (`centr brain recommend`) to select one of three resource profiles:

| Profile      | Target Hardware                 | Recommended Models                       | Max Input Tokens | Max Output Tokens | Request Timeout | Concurrency |
| :----------- | :------------------------------ | :--------------------------------------- | :--------------- | :---------------- | :-------------- | :---------- |
| **minimal**  | < 6 GB RAM, 2-4 cores           | `qwen2.5:1.5b`, `llama3.2:1b`            | 1,024            | 256               | 10,000 ms       | 1           |
| **balanced** | 8 – 12 GB RAM, 4-8 cores        | `llama3.2:3b`, `qwen2.5:3b`, `phi3:mini` | 2,048            | 512               | 15,000 ms       | 1           |
| **quality**  | 16+ GB RAM, GPU / Apple Silicon | `qwen2.5:7b`, `mistral:7b`               | 4,096            | 1,024             | 30,000 ms       | 2           |

### Hardware Detection & Recommendations

Run `centr brain recommend` to inspect your system:

```bash
$ centr brain recommend

Hardware Detection:
  OS:           darwin (arm64)
  Memory:       32.0 GB
  Cores:        10
  Apple Silicon: true
  GPU Support:  true

Recommendation:
  Profile:      quality
  Models:       qwen2.5:7b, llama3.2:3b
  Rationale:    Hardware has 32GB RAM with Apple Silicon unified memory GPU acceleration. Excellent capacity for 7B models with high context quality.
```

---

## Supported Brain Operations

The Brain provides 6 focused semantic operations:

### 1. Task Classification (`classifyTask`)

Categorizes user intent into `feature`, `bugfix`, `refactor`, `test`, `security`, `performance`, `documentation`, or `configuration`, identifies domain areas (e.g. `auth`, `database`, `api`), and estimates change risk (`low`, `medium`, `high`).

### 2. Context Ranking (`rankContext`)

Re-ranks candidate files, symbols, memory entries, and learning experiences retrieved by Core using hybrid scoring:
$$\text{Final Score} = 0.5 \times \text{Deterministic Score} + 0.5 \times \text{Brain Score}$$
Exact symbol and path matches maintain dominance to guarantee precision.

### 3. Failure Analysis (`analyzeFailure`)

Diagnoses runtime errors, test failures, or compiler diagnostics:

- Classifies failure into `configuration`, `type_error`, `permission`, `dependency`, `logic`, or `environment`.
- Pinpoints root causes and formulates actionable recommendations.
- Formulates candidate lessons for Project Memory or Global Learning.

### 4. Learning Extraction (`extractLearning`)

Translates resolved bug fixes and development sessions into generalized, reusable engineering lessons with validation triggers and recommended actions.

### 5. Skill Selection (`selectSkills`)

Selects task-specific development workflows, debugging checklists, and optimization skills from candidate skills based on semantic alignment.

### 6. Module Summarization (`summarize`)

Produces concise, token-budgeted technical summaries of key source files and architectural components.

---

## Architectural Pipeline & Data Flow

```
+-------------------------------------------------------------------------+
|                              Coding Agent                               |
|                  (Claude Code, Codex CLI, Cursor, IDE)                  |
+------------------------------------+------------------------------------+
                                     |
                                     v
                       [ MCP / CLI Context Request ]
                                     |
                                     v
+------------------------------------+------------------------------------+
|                           CentR Core                                    |
|  1. Parse task & query database (FTS5 + SQLite)                         |
|  2. Retrieve candidate items (10-30 files, symbols, memories)          |
|  3. Score candidate items deterministically (0.0 - 1.0)                 |
+------------------------------------+------------------------------------+
                                     |
                    Candidates & Pre-filtered Context
                                     |
                                     v
+------------------------------------+------------------------------------+
|                         CentR V2 Brain                                  |
|  1. Check in-memory hash cache (TTL + LRU eviction)                     |
|  2. If hit: return cached reasoning immediately                        |
|  3. If miss: Format concise, candidate-bounded prompt                   |
|  4. Call local Ollama daemon (AbortSignal timeout)                      |
|  5. Validate JSON response schema                                       |
|  6. Hallucination Guard: reject any ID not in candidate set             |
|  7. Record latency, tokens, cache metrics                               |
+------------------------------------+------------------------------------+
                                     |
                 Rankings / Fallback Deterministic Scores
                                     |
                                     v
+------------------------------------+------------------------------------+
|                    Hybrid Context Synthesizer                           |
|  Score = 0.5 * detScore + 0.5 * brainScore                              |
|  Sort by final score & fit within token budget (e.g. 4000 tokens)       |
+------------------------------------+------------------------------------+
                                     |
                                     v
                          [ Compact Context JSON ]
```

---

## Caching & Telemetry

### Deterministic Hash Cache

- Computed using SHA-256 hash of `(operation, model, inputPayload)`.
- Configurable max entries (default: 500) with oldest-entry LRU eviction.
- Configurable TTL (default: 1 hour) to ensure fast responses on repeated agent turns.

### Metrics Collection

The Brain tracks:

- Total calls, successful calls, and failed calls.
- Timeout frequency and fallback events.
- Average and p95 request latencies.
- Estimated input and output token consumption.
- Cache hit and miss counts.

Inspect stats at any time:

```bash
$ centr brain stats
```

---

## CLI Commands Reference

| Command                                     | Description                                                          |
| :------------------------------------------ | :------------------------------------------------------------------- |
| `centr brain status`                        | Check status, configured provider, model, profile, and availability. |
| `centr brain recommend`                     | Analyze hardware and print recommended profile and model.            |
| `centr brain models`                        | List local models available in Ollama.                               |
| `centr brain enable`                        | Enable Brain enhancement in project config.                          |
| `centr brain disable`                       | Disable Brain enhancement (100% deterministic mode).                 |
| `centr brain profile <profile>`             | Set active resource profile (`minimal`, `balanced`, `quality`).      |
| `centr brain set-model <model>`             | Set specific local model (e.g. `llama3.2:3b`).                       |
| `centr brain stats`                         | Print performance metrics, token usage, and cache rates.             |
| `centr brain benchmark`                     | Run latency and ranking benchmark on local Brain.                    |
| `centr brain analyze-failure --error <msg>` | Run failure analysis on an error message.                            |

---

## MCP Server Integration

The CentR Model Context Protocol server exposes:

1. `project_context` with optional `useBrain: boolean` flag (defaults to project config setting `config.brain.enabled`).
2. `brain_analyze_failure` tool to allow autonomous agents to submit stack traces and errors for local diagnostic reasoning.
