# CentR Global Learning Architecture

> **"Learning answers: What should the agent do differently next time?"**

Global Learning provides cross-project, evidence-based wisdom for AI coding agents. Unlike unvetted LLM outputs or raw scratch notes, CentR learnings must be mathematically substantiated by observed developer experience before being promoted to trusted context.

---

## 1. The Learning Lifecycle

Every global lesson progresses through a rigorous state machine:

```text
┌─────────────────────────────────────────────────────────────┐
│                      LEARNING LIFECYCLE                     │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                     [ 1. CANDIDATE ]
                   (Initial confidence: 0.5)
                             │
                             ▼
                    [ 2. ADD EVIDENCE ]
               (Recorded from test / build runs)
               ┌─────────────┴─────────────┐
               ▼                           ▼
          Success (+)                 Failure (-)
               │                           │
               └─────────────┬─────────────┘
                             ▼
                   [ 3. RECALCULATE ]
          confidence = successes / total_evidence
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   confidence >= 0.7                 confidence < 0.3
    (min 3 evidence)                  or manual reject
            │                                 │
            ▼                                 ▼
     [ 4. VALIDATED ]                  [ 5. REJECTED ]
 (Included in Context Engine)     (Pruned from agent context)
```

---

## 2. Evidence Scoring & Promotion Mathematics

When evidence is submitted (`addEvidence`), confidence is recalculated deterministically:

$$\text{confidence} = \max\left(0.1, \; \frac{\text{successes}}{\text{successes} + \text{failures}}\right)$$

### Validation Gate:
A learning is eligible for promotion to `validated` status **only when**:
1. `confidence >= 0.70` (70% positive outcome rate)
2. `totalEvidence >= 3` (minimum 3 independent validations)

Rejected lessons (`status = 'rejected'`) are strictly excluded from context generation, preventing agents from re-ingesting harmful or outdated patterns.

---

## 3. Storage Schema (SQLite + FTS5)

```sql
CREATE TABLE IF NOT EXISTS learning (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson TEXT NOT NULL,
  category TEXT NOT NULL,
  trigger TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5,
  scope TEXT NOT NULL DEFAULT 'global',
  status TEXT NOT NULL DEFAULT 'candidate', -- 'candidate' | 'validated' | 'rejected'
  source_experience TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learning_id INTEGER NOT NULL REFERENCES learning(id) ON DELETE CASCADE,
  experience TEXT NOT NULL,
  outcome TEXT NOT NULL, -- 'success' | 'failure'
  context TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE IF NOT EXISTS learning_fts USING fts5(
  lesson,
  trigger,
  recommended_action,
  content='learning',
  content_rowid='id'
);
```

---

## 4. CLI Commands

```bash
# Record a new candidate lesson
centr learn add \
  --lesson "Always use Buffer.from(x, 'base64url') when decoding JWT tokens in Node.js" \
  --trigger "JWT decode" \
  --action "Use base64url encoding instead of base64 to avoid padding errors"

# List all validated learnings
centr learn list --validated

# Add evidence
centr learn evidence <id> --outcome success --experience "Unit tests pass with base64url"

# Promote eligible candidate
centr learn promote <id>

# Reject flawed candidate
centr learn reject <id>
```

---

## 5. Security & Privacy Guarantees

- **No Secret Contamination**: Lessons are scanned against `SECRET_CONTENT_PATTERNS` before persistence; tokens, private keys, and passwords are redacted.
- **Auditable History**: Every confidence shift is backed by an explicit `learning_evidence` record.
- **Local-First**: Global learnings are stored locally in the developer's CentR home directory (`~/.centr/learning.db`). No telemetry or remote cloud synchronization occurs without user configuration.
