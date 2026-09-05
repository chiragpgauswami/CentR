# CentR Security Architecture & Guidelines

CentR is designed from the ground up as a **local-first, privacy-preserving** project intelligence middleware for AI coding agents.

---

## 1. Core Security Principles

1. **Local-First & Offline**: All data, indexes, metadata, memories, and learning patterns reside exclusively on the user's local disk in SQLite (`.centr/centr.db`). No code, tokens, or project files are ever uploaded to any remote server or cloud service.
2. **Zero Telemetry**: CentR contains no tracking, telemetry, phone-home mechanisms, or external metrics collection.
3. **Defense-in-Depth Secret Exclusion**: CentR ensures sensitive credentials never enter the search index or context prompt streams.

---

## 2. Secret Filtering Architecture

CentR implements two layers of secret detection during repository indexing:

### A. Filename & Path Pattern Filtering

Files matching sensitive patterns are automatically ignored during discovery:

- Environment files: `.env`, `.env.*`
- Private keys & certificates: `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `id_rsa`, `id_ed25519`
- Cloud & service credentials: `credentials.json`, `service-account*.json`, `token*.json`
- Vault & secret definitions: `secrets.yml`, `secrets.yaml`, `vault.yml`, `*.secret`

### B. File Content Secret Inspection

Even if a file has a common source extension (e.g. `config.ts`), its content is inspected before indexing. Files containing any of the following patterns are excluded from the index:

- PEM RSA/EC/OpenSSH private key headers (`-----BEGIN ... PRIVATE KEY-----`)
- AWS Access Key IDs (`AKIA...`, `ASIA...`)
- GitHub Personal Access Tokens (`ghp_...`, `github_pat_...`)
- Slack OAuth tokens (`xoxb-...`, `xoxp-...`)
- High-entropy API key or bearer tokens in code declarations

---

## 3. Path Traversal Defenses

CentR enforces path boundaries through `sanitizePath()`:

- Input paths are resolved against the project root.
- Path traversal is validated using `path.relative(resolvedRoot, resolvedInput)`.
- Traversal attempts (such as `../../etc/passwd` or prefix-matching sibling directory attacks like `../project-evil/exploit.txt`) throw a `SecurityError`.

---

## 4. Symlink Loop Prevention

CentR traverses directories while resolving canonical paths via `fs.realpathSync`. Canonical paths are tracked in a visited set, preventing infinite recursion or denial-of-service from cyclic directory symlinks.

---

## 5. SQL Injection Defenses

CentR interacts with SQLite strictly via parameterized queries (`db.prepare('...').run(? , ?)` or `db.all(query, params)`). Raw user input or file names are never concatenated or interpolated directly into SQL statements.

---

## 6. Sanitized Logging

Log output is filtered through `sanitizeForLogging()` to automatically redact tokens, bearer credentials, and API keys before writing to console or error streams.

---

## 7. Brain V2 Local AI Security & Sandbox

CentR V2 integrates Small Language Models (SLMs) with strict security bounds:

1. **Local-Only Communication**: All model interactions default to local loopback (`http://127.0.0.1:11434`). No source code or prompts are sent over public networks.
2. **Read-Only / No Autonomous Execution**: The Brain model cannot run shell commands, alter files on disk, or modify system configurations. It only ranks and annotates candidate items.
3. **Bounded Context Windows**: The Brain only receives candidate sets pre-screened by Core. Repository-wide source leaks are impossible.
4. **Strict Hallucination Boundary**: Brain outputs are verified against ground-truth candidate identifiers before being included in prompt context. Invented paths or references are rejected.
5. **Prompt Injection Isolation**: Prompts use structured format delimiters and JSON schema validation. Malicious comments or code in repositories cannot hijack the agent or bypass the strict candidate filter.
