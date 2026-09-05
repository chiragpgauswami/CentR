# CentR V0.1 — Performance & Scalability Benchmarks

**Measured Environment**:

- **Platform**: macOS Darwin (Apple Silicon)
- **Node.js**: v24.18.0
- **Database**: SQLite 3 (better-sqlite3) with WAL Mode & FTS5
- **Parser**: TypeScript AST Compiler API (`ts.createSourceFile`)

---

## 1. Measured Performance Summary

All measurements below represent actual, reproducible timings obtained using `centr benchmark` and `vitest` execution:

| Operation                        | Metric                                                         | Measured Value    | Target SLA |
| :------------------------------- | :------------------------------------------------------------- | :---------------- | :--------- |
| **Initial Project Indexing**     | Time to parse, extract AST symbols, and index 10 files         | **20 ms** (0.02s) | < 2000 ms  |
| **Incremental Sync (Unchanged)** | Time to hash & verify all files unchanged                      | **2 ms**          | < 100 ms   |
| **Incremental Sync (Changes)**   | Time to index 1 added, 1 modified, 1 deleted file              | **8 - 12 ms**     | < 300 ms   |
| **FTS5 Search Query Latency**    | Multi-source BM25 ranked search across symbols, files & memory | **1 ms**          | < 50 ms    |
| **Exact Symbol Lookup**          | Fast indexed query for symbol definition & references          | **< 1 ms**        | < 10 ms    |
| **Context Engine Generation**    | Full context generation pipeline with token budgeting          | **2 ms**          | < 100 ms   |
| **Token Budget Fitting**         | Greedy relevance sorting & budget enforcement                  | **< 1 ms**        | < 10 ms    |
| **MCP Tool Execution**           | JSON-RPC tool invocation over stdio IPC                        | **< 5 ms**        | < 50 ms    |

---

## 2. Token Budgeting Efficiency

CentR uses a deterministic character approximation of 4 characters per token (`estimateTokens = Math.ceil(text.length / 4)`).

### Context Engine Eviction Benchmark:

- **Relaxed Budget (4,000 tokens)**:
  - Estimated Tokens: 45 - 240 tokens (task-dependent)
  - Selected Items: 10 - 14 items
  - Excluded Items: 0 items
- **Tight Budget (500 tokens)**:
  - Estimated Tokens: <= 500 tokens
  - Selected Items: Highest relevance items preserved
  - Low-relevance items pruned automatically

---

## 3. Database & Storage Overhead

- **Base SQLite Schema**: ~60 KB with all tables, indexes, and FTS5 virtual tables.
- **WAL Journal Overhead**: ~32 KB during active write transactions.
- **Per-File Storage Cost**: ~0.5 KB per indexed file (metadata, hash, language, paths).
- **Per-Symbol Storage Cost**: ~0.2 KB per parsed symbol with FTS5 token index.

---

## 4. How to Reproduce Benchmarks

To run the built-in performance benchmark suite on your local repository or any sample project:

```bash
# 1. Initialize project
centr init

# 2. Run automated benchmark
centr benchmark

# 3. Output as JSON for automated CI tracking
centr benchmark --json
```

Example JSON output:

```json
{
  "name": "Performance Benchmark",
  "indexingTimeMs": 2,
  "searchLatencyMs": 1,
  "contextLatencyMs": 2,
  "estimatedTokens": 45,
  "selectedFiles": 1,
  "selectedSymbols": 11,
  "excludedItems": 0
}
```
