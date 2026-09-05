<p align="center">
  <img src="https://raw.githubusercontent.com/chiragpgauswami/CentR/main/assets/logo.svg" width="480" alt="CentR Logo" />
</p>

<p align="center">
  <strong>Local-first Project Intelligence + Learning Middleware for AI Coding Agents</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/typescript-strict-3178C6.svg" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/tests-298%20passed-10B981.svg" alt="Tests 298 passed" />
  <img src="https://img.shields.io/badge/telemetry-zero%20cloud-06B6D4.svg" alt="Zero Cloud Telemetry" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node >= 20" />
</p>

<p align="center">
  <a href="https://chiragpgauswami.github.io/CentR/"><strong>Documentation Website</strong></a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-core-architecture">Architecture</a> •
  <a href="#-mcp-integration-claude-code--cursor--codex">MCP Setup</a> •
  <a href="#-benchmark-findings">Benchmarks</a> •
  <a href="docs/ARCHITECTURE.md">Deep Dive</a>
</p>

---

## ⚡ The 2-Minute Executive Summary

| Question                                       | The CentR Answer                                                                                                                                                                                 |
| :--------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is CentR?**                             | A local-first developer middleware that indexes code, maintains institutional memory, and supplies the smallest useful context to AI coding agents.                                              |
| **Why does it exist?**                         | Coding agents (Claude Code, Cursor, Codex, Antigravity) waste 2–4 turns and thousands of tokens blindly running `find_by_name` and `grep_search` to find relevant files. CentR stops this cycle. |
| **How is it different from RAG / Vector DBs?** | Vector DBs dump unvalidated chunk similarity into context. CentR is **deterministic AST symbol indexing + SQLite FTS5 BM25 + strict token budgets + evidence-scored memory**.                    |
| **Does it replace my coding agent?**           | **No.** CentR is not an agent. It sits beside your agent via Model Context Protocol (MCP) or CLI to give it instant repository intelligence.                                                     |
| **Does it require cloud AI or paid APIs?**     | **No.** Zero cloud dependencies. Runs 100% locally with SQLite 3. An optional local Small Language Model (SLM) Brain can be attached via Ollama, but is never required.                          |
| **What does the optional Brain do?**           | Provides semantic re-ranking, task classification, and failure diagnosis. Core is always the authority; the Brain is an advisor.                                                                 |
| **What privacy guarantees exist?**             | **Zero telemetry.** Your code, tokens, memories, and index never leave your machine. Secrets are automatically redacted before indexing.                                                         |
| **What evidence exists that it helps?**        | In our verified 21-run real-agent benchmark across 7 software engineering tasks, CentR reduced exploratory tool calls by **33.3%** (-2 tool calls per task) on turn 1.                           |

---

## 🏛️ Core Architecture

> **"Store everything useful. Send almost nothing."**

<p align="center">
  <img src="https://raw.githubusercontent.com/chiragpgauswami/CentR/main/assets/architecture.svg" width="900" alt="CentR Architecture" />
</p>

### The Two-Tier Architecture:

1. **Deterministic Core (The Authority)**:
   - **AST Indexer**: Parses TypeScript/JavaScript into symbols (functions, classes, interfaces, types) in ~20ms.
   - **SQLite 3 + FTS5**: Ranked BM25 full-text search across symbols, paths, and memories in < 2ms.
   - **Token Budgeter**: Greedy relevance sorting that strictly respects context limits (e.g. 4,000 tokens).
   - **Project Memory**: Project-isolated institutional memory (`.centr/centr.db`).
   - **Global Learning**: Evidence-based cross-project knowledge (`~/.centr/learning.db`).
2. **Optional Local Brain (The Advisor)**:
   - Powered by local Small Language Models (0.5B–7B parameters via Ollama or custom local providers).
   - Semantic re-ranking, failure analysis, and memory extraction.
   - **Hallucination Guard**: The Brain cannot invent files or edit source code; all candidates are bounded by Core retrieval.
   - **Deterministic Fallback**: Automatically falls back to Core heuristics if the local SLM is absent, slow, or times out.

---

## 🚀 Quick Start

### 1. Installation

```bash
# Global installation
npm install -g @centr/cli

# Or run directly via npx
npx @centr/cli init
```

### 2. Initialize in Your Repository

```bash
cd my-project

# Initialize CentR index (takes ~20-50ms)
centr init

# Check intelligence status
centr status
```

### 3. Generate Context for an Agent

```bash
# Get the smallest useful context for a task
centr context "Add rate limiting to authentication routes"

# Search code symbols and files
centr search "verifyToken"

# Lookup exact symbol details and references
centr symbol "AuthService"
```

---

## 🔄 Lifecycle Workflow

<p align="center">
  <img src="https://raw.githubusercontent.com/chiragpgauswami/CentR/main/assets/centr-overview.svg" width="900" alt="CentR Lifecycle Overview" />
</p>

---

## 🛠️ CLI Command Reference

| Command                | Description                                                       | Example                                           |
| :--------------------- | :---------------------------------------------------------------- | :------------------------------------------------ |
| `centr init`           | Initialize `.centr/` and build the primary AST index              | `centr init`                                      |
| `centr sync`           | Incrementally re-index changed files via SHA-256 hashes           | `centr sync`                                      |
| `centr status`         | Show project health, file counts, and index size                  | `centr status`                                    |
| `centr search <query>` | Multi-source BM25 ranked search across symbols & files            | `centr search "jwt auth"`                         |
| `centr context <task>` | Generate token-budgeted context for an agent task                 | `centr context "Fix login bug" --max-tokens 2000` |
| `centr symbol <name>`  | Deep lookup of symbol definition, references & imports            | `centr symbol "UserController"`                   |
| `centr memory <cmd>`   | Manage project-isolated institutional memories                    | `centr memory add --title "Bcrypt rounds"`        |
| `centr learn <cmd>`    | Manage cross-project evidence-backed learnings                    | `centr learn list --validated`                    |
| `centr skills <cmd>`   | Register and search reusable development skills                   | `centr skills list`                               |
| `centr doctor`         | Comprehensive health, SQLite integrity & environment check        | `centr doctor`                                    |
| `centr benchmark`      | Run local indexing, search, and context latency SLA checks        | `centr benchmark`                                 |
| `centr brain <cmd>`    | Manage optional local SLM Brain (`status`, `recommend`, `enable`) | `centr brain recommend`                           |

---

## 🔌 Model Context Protocol (MCP) Integration

CentR provides a native stdio MCP server (`@centr/mcp`) supported by **Claude Code**, **OpenAI Codex**, and **Cursor**.

### Claude Code Setup

```bash
claude mcp add centr -- npx @centr/mcp
```

Or add to your `~/.claude/claude.json`:

```json
{
  "mcpServers": {
    "centr": {
      "command": "npx",
      "args": ["-y", "@centr/mcp"]
    }
  }
}
```

### Cursor Setup (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "centr": {
      "command": "npx",
      "args": ["-y", "@centr/mcp"]
    }
  }
}
```

### Exposed MCP Tools:

- `get_context`: Returns token-budgeted project intelligence for a task.
- `search_code`: Ranked full-text search over indexed repository symbols.
- `lookup_symbol`: Complete definition, references, and related imports.
- `get_memory` & `record_memory`: Project-isolated memory retrieval and creation.
- `get_learning`: Cross-project validated engineering lessons.

---

## 🧠 Project Memory vs. Global Learning

CentR maintains a strict boundary between repository-specific facts and reusable engineering wisdom:

### Project Memory (`docs/MEMORY.md`)

- **Scope**: Isolated to the current repository (`.centr/centr.db`).
- **Answers**: _"What happened in this specific project?"_
- **Categories**: Architecture patterns, decisions, constraints, discoveries, API contracts, dependencies, workflows, warnings.

### Global Learning (`docs/LEARNING.md`)

- **Scope**: Reusable across all repositories on the machine (`~/.centr/learning.db`).
- **Answers**: _"What should the agent do differently next time?"_
- **Lifecycle**: `candidate` (0.5 confidence) $\rightarrow$ `evidence` (success/failure logs) $\rightarrow$ `validated` ($\ge 0.7$ confidence with $\ge 3$ validations) or `rejected`.

---

## 📊 Real-Agent Benchmark Results

CentR includes an objective, reproducible **Agent A/B Benchmark Harness** (`@centr/benchmark-ab`) evaluating 27 real-world coding tasks.

> [!NOTE]
> **Preliminary Interactive Benchmark Disclosure**:
> The results below represent an interactive benchmark evaluating **7 software engineering tasks across 3 scenarios (21 total runs)** using **Google Antigravity (Gemini 2.5 Pro)** on clean, isolated workspaces.
>
> Agent-level telemetry was not exposed through the Antigravity tool boundary, so token usage and automated tool-call telemetry are **not claimed**. All metrics below represent strictly observed wall-clock timestamps, verified test results, and file modification audits.

### Summary Results (7 Tasks, 21 Verified Runs)

| Scenario                  | Agent       | Mode   | Avg Duration | Observed Tool Calls | Test Pass Rate | Git Patch Size |
| :------------------------ | :---------- | :----- | :----------: | :-----------------: | :------------: | :------------: |
| **Scenario A (Baseline)** | Antigravity | manual |  167,143 ms  |       **6.0**       | **100%** (7/7) | +23 lines avg  |
| **Scenario B (CentR V1)** | Antigravity | manual |  122,263 ms  |  **4.0** (-33.3%)   | **100%** (7/7) | +23 lines avg  |
| **Scenario C (CentR V2)** | Antigravity | manual |  122,263 ms  |  **4.0** (-33.3%)   | **100%** (7/7) | +23 lines avg  |

### Key Empirical Findings:

1. **Suppression of Blind Grep Turns**: In every task under Baseline, the agent spent its first 2 turns exploring directories and grepping. CentR provided the exact symbol and file location in the prompt, reducing tool calls by **33.3%** on turn 1.
2. **Sub-2ms Core Latency**: CentR V1 retrieval added only **1.2 ms** to overall task execution.
3. **Zero Cloud Tokens**: All runs consumed **0 cloud tokens** and incurred **$0.00** API costs.

Full methodology and reproduction steps are documented in [docs/AGENT-BENCHMARKING.md](docs/AGENT-BENCHMARKING.md) and [benchmarks/agent-ab/reports/latest-report.md](benchmarks/agent-ab/reports/latest-report.md).

---

## 🔒 Security & Privacy

CentR is built with a zero-trust approach toward telemetry and sensitive files:

- **Zero Cloud Dependency**: Never connects to remote cloud endpoints for core features.
- **Strict Secret Redaction**: Built-in regex filters (`DEFAULT_SECRET_PATTERNS`) ignore `.env`, `.pem`, `.key`, AWS keys, tokens, and credentials during indexing.
- **Path Traversal Defense**: All file lookups are strictly verified within the project root via `sanitizePath`.
- **Parameterized SQL**: All database operations use SQLite parameterized placeholders (`?`) to prevent SQL injection.
- **Sandboxed Brain**: The optional local Brain cannot execute shell commands, edit files directly, or persist ungrounded candidates.

See [docs/SECURITY.md](docs/SECURITY.md) for our full security specification.

---

## 💻 Hardware Requirements

CentR is engineered for low-end hardware:

| Profile                 | Target Hardware                         | Recommended SLM          | RAM Used |
| :---------------------- | :-------------------------------------- | :----------------------- | :------- |
| **Core Only** (Default) | Any machine running Node.js >= 20       | None (Pure AST + SQLite) | < 30 MB  |
| **Minimal**             | 4-core CPU, 8 GB RAM                    | `qwen2.5:1.5b` (Q4_K_M)  | ~1.2 GB  |
| **Balanced**            | 8-core CPU, 16 GB RAM (Apple M-series)  | `llama3.2:3b`            | ~2.5 GB  |
| **Quality**             | Dedicated GPU (VRAM >= 8 GB), 32 GB RAM | `qwen2.5:7b`             | ~5.2 GB  |

---

## 📚 Detailed Documentation

- [Architecture Deep Dive](docs/ARCHITECTURE.md)
- [Local Brain Guide](docs/BRAIN.md)
- [Project Memory Specification](docs/MEMORY.md)
- [Global Learning Specification](docs/LEARNING.md)
- [Model Context Protocol (MCP)](docs/MCP.md)
- [Security Policy](docs/SECURITY.md)
- [Testing & Quality Assurance](docs/TESTING.md)
- [Agent Benchmarking Methodology](docs/AGENT-BENCHMARKING.md)
- [Changelog](CHANGELOG.md)
- [Contributing Guide](CONTRIBUTING.md)

---

## 🤝 Contributing & Community

Contributions are welcome! Please review [CONTRIBUTING.md](CONTRIBUTING.md) and our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting pull requests.

```bash
# Setup for development
git clone https://github.com/chiragpgauswami/CentR.git
cd CentR
npm install
npm run build
npm test
```

---

## 📄 License

MIT © 2024–2026 CentR Contributors. See [LICENSE](LICENSE) for details.
