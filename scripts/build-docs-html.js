import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.resolve('website/docs');
fs.mkdirSync(DOCS_DIR, { recursive: true });

const NAV_ITEMS = [
  {
    group: 'Introduction',
    items: [
      { title: 'Getting Started', file: 'getting-started.html' },
      { title: 'Architecture', file: 'architecture.html' },
    ],
  },
  {
    group: 'Core Intelligence',
    items: [
      { title: 'Project Memory', file: 'memory.html' },
      { title: 'Global Learning', file: 'learning.html' },
      { title: 'Optional Local Brain', file: 'brain.html' },
    ],
  },
  {
    group: 'Tools & Integrations',
    items: [
      { title: 'Model Context Protocol (MCP)', file: 'mcp.html' },
      { title: 'CLI Command Reference', file: 'cli.html' },
    ],
  },
  {
    group: 'Engineering & Standards',
    items: [
      { title: 'Security & Privacy', file: 'security.html' },
      { title: 'Benchmarks & Validation', file: 'benchmarks.html' },
      { title: 'Contributing Guide', file: 'contributing.html' },
    ],
  },
];

function renderSidebar(activeFile) {
  let html = `<div class="docs-sidebar">
    <div style="margin-bottom: 1.25rem;">
      <input type="text" id="docs-search" placeholder="Search documentation..." style="width: 100%; padding: 0.45rem 0.75rem; background: var(--code-bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 0.85rem;" />
    </div>`;

  for (const group of NAV_ITEMS) {
    html += `<div class="sidebar-group">
      <div class="sidebar-title">${group.group}</div>`;
    for (const item of group.items) {
      const active = item.file === activeFile ? 'active' : '';
      html += `<a href="${item.file}" class="sidebar-link ${active}">${item.title}</a>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function renderPage({ title, description, activeFile, content }) {
  const canonicalUrl = `https://chiragpgauswami.github.io/CentR/docs/${activeFile}`;
  const socialImgUrl = `https://chiragpgauswami.github.io/CentR/assets/social-preview.svg`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — CentR Documentation</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">
  <meta name="author" content="CentR Contributors">
  <meta name="theme-color" content="#080C14">
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
  <link rel="stylesheet" href="../styles/main.css">

  <!-- Open Graph / Social Media -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="CentR">
  <meta property="og:title" content="${title} — CentR Documentation">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${socialImgUrl}">
  <meta property="og:image:alt" content="${title} — CentR Documentation">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} — CentR Documentation">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${socialImgUrl}">

  <!-- Structured Data (Schema.org TechArticle) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": "${title}",
    "description": "${description}",
    "url": "${canonicalUrl}",
    "isPartOf": {
      "@type": "WebSite",
      "name": "CentR",
      "url": "https://chiragpgauswami.github.io/CentR/"
    }
  }
  </script>
</head>
<body>
  <!-- Header -->
  <header class="header">
    <div class="header-container">
      <a href="../index.html" class="brand">
        <img src="../assets/icon.svg" alt="CentR Icon" class="brand-icon">
        <span>Cent<span style="color: var(--accent);">R</span></span>
        <span class="brand-tag">v0.1.0</span>
      </a>

      <nav class="nav">
        <a href="getting-started.html" class="nav-link ${activeFile === 'getting-started.html' ? 'active' : ''}">Getting Started</a>
        <a href="architecture.html" class="nav-link ${activeFile === 'architecture.html' ? 'active' : ''}">Architecture</a>
        <a href="memory.html" class="nav-link ${activeFile === 'memory.html' ? 'active' : ''}">Memory</a>
        <a href="learning.html" class="nav-link ${activeFile === 'learning.html' ? 'active' : ''}">Learning</a>
        <a href="brain.html" class="nav-link ${activeFile === 'brain.html' ? 'active' : ''}">Local Brain</a>
        <a href="mcp.html" class="nav-link ${activeFile === 'mcp.html' ? 'active' : ''}">MCP</a>
        <a href="cli.html" class="nav-link ${activeFile === 'cli.html' ? 'active' : ''}">CLI</a>
        <a href="benchmarks.html" class="nav-link ${activeFile === 'benchmarks.html' ? 'active' : ''}">Benchmarks</a>
        <a href="security.html" class="nav-link ${activeFile === 'security.html' ? 'active' : ''}">Security</a>
      </nav>

      <div class="nav-actions">
        <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
          <span id="theme-icon">☀️</span>
        </button>
        <a href="https://github.com/chiragpgauswami/CentR" target="_blank" rel="noopener noreferrer" class="btn-github">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </a>
      </div>
    </div>
  </header>

  <!-- Docs Container -->
  <div class="container">
    <div class="docs-layout">
      ${renderSidebar(activeFile)}
      <main class="docs-content">
        <nav class="breadcrumb" aria-label="Breadcrumb" style="margin-bottom: 1.5rem; font-size: 0.85rem; color: var(--text-muted);">
          <a href="../index.html" style="color: var(--text-muted); text-decoration: none;">CentR</a>
          <span style="margin: 0 0.5rem;">/</span>
          <a href="getting-started.html" style="color: var(--text-muted); text-decoration: none;">Docs</a>
          <span style="margin: 0 0.5rem;">/</span>
          <span style="color: var(--accent); font-weight: 500;">${title}</span>
        </nav>
        ${content}
      </main>
    </div>
  </div>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <div class="footer-bottom">
        <span>MIT © 2024–2026 CentR Contributors. Local-first developer infrastructure.</span>
        <span><a href="../index.html">← Back to Homepage</a></span>
      </div>
    </div>
  </footer>

  <script src="../scripts/main.js"></script>
</body>
</html>`;
}

// 1. Getting Started
const gettingStarted = `
<h1>Getting Started with CentR</h1>
<p>CentR is developer middleware that reduces repeated repository exploration by providing task-relevant project intelligence, project memory, and cross-project learning.</p>

<div class="callout">
  <div class="callout-title">Prerequisites</div>
  <p>Node.js >= 20.0.0 and npm are required. CentR uses native SQLite 3 bindings with zero mandatory cloud AI services.</p>
</div>

<h2>1. Global Installation</h2>
<div class="code-block">
  <div class="code-header"><span>bash</span><button class="install-copy-btn copy-btn">Copy</button></div>
  <div class="code-content"><pre><code>npm install -g @centr-ai/cli</code></pre></div>
</div>

<h2>2. Initialize Your Repository</h2>
<p>Navigate to your project root and run <code>centr init</code>. CentR parses your TypeScript/JavaScript codebase using the TypeScript Compiler API and builds an in-process SQLite 3 FTS5 index in ~20-50ms.</p>
<div class="code-block">
  <div class="code-header"><span>bash</span><button class="install-copy-btn copy-btn">Copy</button></div>
  <div class="code-content"><pre><code>cd my-project
centr init</code></pre></div>
</div>

<h2>3. Query Context for an Agent</h2>
<p>Ask CentR for the smallest useful piece of project intelligence needed to complete a task:</p>
<div class="code-block">
  <div class="code-header"><span>bash</span><button class="install-copy-btn copy-btn">Copy</button></div>
  <div class="code-content"><pre><code>centr context "Add rate limiting middleware to auth routes"</code></pre></div>
</div>

<h2>4. Incremental Syncing</h2>
<p>As you modify files, update your index in milliseconds using SHA-256 change detection:</p>
<div class="code-block">
  <div class="code-header"><span>bash</span><button class="install-copy-btn copy-btn">Copy</button></div>
  <div class="code-content"><pre><code>centr sync</code></pre></div>
</div>
`;

// 2. Architecture
const architecture = `
<h1>CentR Architecture Deep Dive</h1>
<p>CentR is architected on a single inviolable principle: <strong>Deterministic Core is the authority; the optional Local Brain is an advisor.</strong></p>

<div style="margin: 2rem 0;">
  <img src="../assets/architecture.svg" alt="Architecture Diagram" style="width: 100%; border-radius: 12px; border: 1px solid var(--border);" />
</div>

<h2>The Two-Tier Subsystem</h2>
<h3>1. Deterministic Core (The Authority)</h3>
<ul>
  <li><strong>AST Indexer</strong>: Extracts qualified function signatures, classes, interfaces, and exported symbols.</li>
  <li><strong>SQLite 3 + WAL Mode</strong>: Fast concurrent in-process database storage.</li>
  <li><strong>FTS5 BM25 Engine</strong>: Sub-2ms full-text ranking across symbols, file paths, and project memory.</li>
  <li><strong>Token Budgeter</strong>: Greedy relevance packing to fit within context limits (e.g. 4000 tokens).</li>
  <li><strong>Project Memory</strong>: Project-isolated institutional memory.</li>
  <li><strong>Global Learning</strong>: Cross-project evidence-backed knowledge.</li>
</ul>

<h3>2. Optional Local Brain (The Advisor)</h3>
<ul>
  <li>Powered by local Small Language Models (0.5B–7B parameters via Ollama or custom local providers).</li>
  <li>Semantic re-ranking, task classification, and failure diagnosis.</li>
  <li><strong>Hallucination Guard</strong>: Strictly prunes any invented candidate IDs; only Core candidates can be returned.</li>
  <li><strong>Deterministic Fallback</strong>: If the local SLM is absent, slow, or times out, CentR automatically falls back to Core heuristics.</li>
</ul>
`;

// 3. Memory
const memory = `
<h1>Project Memory Specification</h1>
<p><strong>"Memory answers: What happened in this project?"</strong></p>
<p>Project Memory provides persistent, project-isolated institutional knowledge. It prevents AI agents from repeating historical errors or forgetting architectural decisions.</p>

<h2>Memory Categories</h2>
<div class="table-wrapper">
  <table>
    <thead><tr><th>Category</th><th>Purpose</th><th>Example</th></tr></thead>
    <tbody>
      <tr><td><code>architecture</code></td><td>Structural conventions and layering</td><td>"Database access must go through DatabaseService, never direct SQL in controllers."</td></tr>
      <tr><td><code>decision</code></td><td>Rationale for technical choices</td><td>"Using bcrypt with 12 salt rounds per Security Policy RFC-104."</td></tr>
      <tr><td><code>constraint</code></td><td>Environmental or memory limitations</td><td>"Worker processes must not exceed 256MB RAM in container."</td></tr>
      <tr><td><code>discovery</code></td><td>Nuances discovered during development</td><td>"Auth token verification must tolerate 60s clock skew."</td></tr>
      <tr><td><code>api</code></td><td>Contract rules and headers</td><td>"All POST endpoints require an Idempotency-Key header."</td></tr>
    </tbody>
  </table>
</div>

<h2>CLI Usage</h2>
<div class="code-block">
  <div class="code-header"><span>bash</span><button class="install-copy-btn copy-btn">Copy</button></div>
  <div class="code-content"><pre><code># Record a project memory
centr memory add --title "Bcrypt rounds" --category decision --content "Use 12 salt rounds for password hashing"

# Search memories
centr memory search "password"</code></pre></div>
</div>
`;

// 4. Learning
const learning = `
<h1>Global Learning Specification</h1>
<p><strong>"Learning answers: What should the agent do differently next time?"</strong></p>
<p>Global Learning provides cross-project, evidence-based wisdom for AI coding agents. Unlike raw scratch notes, lessons must be mathematically substantiated by observed developer experience.</p>

<h2>The Learning Lifecycle</h2>
<ol>
  <li><strong>Candidate</strong>: Recorded with initial confidence of 0.5.</li>
  <li><strong>Evidence</strong>: Observations of success or failure are attached.</li>
  <li><strong>Confidence Recalculation</strong>: Confidence is updated via success ratio.</li>
  <li><strong>Validated / Rejected</strong>: Promoted to validated if confidence &ge; 70% with &ge; 3 validations; rejected lessons are pruned.</li>
</ol>

<h2>Confidence Formula</h2>
<p>Confidence is calculated deterministically:</p>
<div class="code-block">
  <div class="code-header"><span>formula</span></div>
  <div class="code-content"><pre><code>confidence = max(0.1, successes / (successes + failures))</code></pre></div>
</div>

<h2>CLI Usage</h2>
<div class="code-block">
  <div class="code-header"><span>bash</span><button class="install-copy-btn copy-btn">Copy</button></div>
  <div class="code-content"><pre><code># Record candidate lesson
centr learn add --lesson "Always use Buffer.from(x, 'base64url') when decoding JWTs" --trigger "JWT" --action "Use base64url encoding"

# Add positive evidence
centr learn evidence 1 --outcome success --experience "Unit tests pass"

# List validated learnings
centr learn list --validated</code></pre></div>
</div>
`;

// 5. Brain
const brain = `
<h1>Optional Local Brain Guide</h1>
<p>CentR V2 introduces an optional local Small Language Model (SLM) reasoning layer. The Brain acts as a specialized context re-ranking filter with <strong>zero cloud APIs</strong> and <strong>100% offline privacy</strong>.</p>

<div class="callout">
  <div class="callout-title">Core Authority Invariant</div>
  <p>The Brain cannot execute shell commands, edit files directly, invent ungrounded file paths, or bypass Core validation. It operates strictly as an advisor.</p>
</div>

<h2>Hardware-Aware Profiles</h2>
<div class="table-wrapper">
  <table>
    <thead><tr><th>Profile</th><th>Target System</th><th>Recommended Model</th><th>RAM Footprint</th></tr></thead>
    <tbody>
      <tr><td><strong>Minimal</strong></td><td>4-core CPU, 8 GB RAM</td><td><code>qwen2.5:1.5b</code></td><td>~1.2 GB</td></tr>
      <tr><td><strong>Balanced</strong></td><td>8-core CPU, 16 GB RAM (Apple M-series)</td><td><code>llama3.2:3b</code></td><td>~2.5 GB</td></tr>
      <tr><td><strong>Quality</strong></td><td>Dedicated GPU (VRAM &ge; 8GB), 32 GB RAM</td><td><code>qwen2.5:7b</code></td><td>~5.2 GB</td></tr>
    </tbody>
  </table>
</div>

<h2>CLI Commands</h2>
<div class="code-block">
  <div class="code-header"><span>bash</span><button class="install-copy-btn copy-btn">Copy</button></div>
  <div class="code-content"><pre><code># Inspect hardware recommendation
centr brain recommend

# Check status
centr brain status

# Enable Brain
centr brain enable</code></pre></div>
</div>
`;

// 6. MCP
const mcp = `
<h1>Model Context Protocol (MCP) Integration</h1>
<p>CentR provides a production-grade stdio Model Context Protocol (MCP) server via <code>@centr-ai/mcp</code>, allowing Claude Code, Cursor, and OpenAI Codex to query project intelligence seamlessly.</p>

<h2>Claude Code Configuration</h2>
<p>Run the following command to register CentR with Claude Code:</p>
<div class="code-block">
  <div class="code-header"><span>bash</span><button class="install-copy-btn copy-btn">Copy</button></div>
  <div class="code-content"><pre><code>claude mcp add centr -- npx @centr-ai/mcp</code></pre></div>
</div>

<h2>Cursor Configuration (<code>.cursor/mcp.json</code>)</h2>
<div class="code-block">
  <div class="code-header"><span>json</span><button class="install-copy-btn copy-btn">Copy</button></div>
  <div class="code-content"><pre><code>{
  "mcpServers": {
    "centr": {
      "command": "npx",
      "args": ["-y", "@centr-ai/mcp"]
    }
  }
}</code></pre></div>
</div>

<h2>Exposed MCP Tools</h2>
<ul>
  <li><code>get_context</code>: Token-budgeted project intelligence for a task.</li>
  <li><code>search_code</code>: Ranked full-text BM25 search across repository symbols.</li>
  <li><code>lookup_symbol</code>: Deep definition, signature, and reference retrieval.</li>
  <li><code>get_memory</code> & <code>record_memory</code>: Project-isolated memory operations.</li>
  <li><code>get_learning</code>: Cross-project validated engineering lessons.</li>
</ul>
`;

// 7. CLI
const cli = `
<h1>CLI Command Reference</h1>
<p>Complete documentation of all commands exposed by the <code>centr</code> command-line interface.</p>

<h2>Primary Commands</h2>
<div class="table-wrapper">
  <table>
    <thead><tr><th>Command</th><th>Description</th><th>Example</th></tr></thead>
    <tbody>
      <tr><td><code>centr init</code></td><td>Initialize CentR and build AST index</td><td><code>centr init</code></td></tr>
      <tr><td><code>centr sync</code></td><td>Incrementally sync changed files via SHA-256</td><td><code>centr sync</code></td></tr>
      <tr><td><code>centr status</code></td><td>Display project intelligence status & stats</td><td><code>centr status</code></td></tr>
      <tr><td><code>centr search &lt;query&gt;</code></td><td>Ranked BM25 search across symbols & paths</td><td><code>centr search "auth"</code></td></tr>
      <tr><td><code>centr context &lt;task&gt;</code></td><td>Generate token-budgeted context for an agent</td><td><code>centr context "Fix login bug"</code></td></tr>
      <tr><td><code>centr symbol &lt;name&gt;</code></td><td>Lookup symbol definition and references</td><td><code>centr symbol "UserController"</code></td></tr>
      <tr><td><code>centr memory &lt;cmd&gt;</code></td><td>Manage project-isolated institutional memories</td><td><code>centr memory add ...</code></td></tr>
      <tr><td><code>centr learn &lt;cmd&gt;</code></td><td>Manage cross-project evidence-backed learnings</td><td><code>centr learn list</code></td></tr>
      <tr><td><code>centr skills &lt;cmd&gt;</code></td><td>Register and search development skills</td><td><code>centr skills list</code></td></tr>
      <tr><td><code>centr doctor</code></td><td>Verify environment, SQLite integrity, and schema</td><td><code>centr doctor</code></td></tr>
      <tr><td><code>centr benchmark</code></td><td>Run latency SLA and real-agent A/B benchmarks</td><td><code>centr benchmark</code></td></tr>
      <tr><td><code>centr brain &lt;cmd&gt;</code></td><td>Manage optional local SLM Brain</td><td><code>centr brain recommend</code></td></tr>
    </tbody>
  </table>
</div>
`;

// 8. Security
const security = `
<h1>Security & Privacy Policy</h1>
<p>CentR is engineered with a strict zero-trust posture toward cloud telemetry and code leakage.</p>

<h2>Non-Negotiable Privacy Guarantees</h2>
<ul>
  <li><strong>100% Local Storage</strong>: Indexes, memories, and learnings are stored in local SQLite databases (<code>.centr/centr.db</code> and <code>~/.centr/learning.db</code>).</li>
  <li><strong>Zero Cloud Telemetry</strong>: No code, tokens, file paths, or telemetry are ever transmitted to remote cloud servers.</li>
  <li><strong>Automated Secret Redaction</strong>: Automatic exclusion of <code>.env</code>, <code>.pem</code>, <code>.key</code>, AWS tokens, GitHub PATs, and private keys via <code>DEFAULT_SECRET_PATTERNS</code>.</li>
  <li><strong>Path Traversal Defense</strong>: All file accesses are verified and constrained within the project root via <code>sanitizePath</code>.</li>
  <li><strong>Parameterized SQL</strong>: 100% of database queries use SQLite parameterized placeholders (<code>?</code>), preventing SQL injection.</li>
  <li><strong>Sandboxed Brain</strong>: The optional local Brain cannot execute shell commands, edit files directly, or escape candidate sets.</li>
</ul>
`;

// 9. Benchmarks
const benchmarks = `
<h1>Real-Agent A/B Benchmark Validation</h1>
<p>CentR includes an objective, reproducible <strong>Agent A/B Benchmark Harness</strong> evaluating 27 real software engineering tasks across 7 categories.</p>

<div class="callout">
  <div class="callout-title">Preliminary Interactive Benchmark Disclosure</div>
  <p>Preliminary interactive benchmark observations showed fewer exploratory tool calls in the tested scenarios. Agent token telemetry was not available, so these results should not be interpreted as a controlled measurement of token savings or universal performance improvement. Observed tool call counts and test results represent verified executions.</p>
</div>

<h2>Summary of Results (7 Tasks, 21 Verified Runs)</h2>
<div class="table-wrapper">
  <table>
    <thead><tr><th>Scenario</th><th>Mode</th><th>Avg Completion Time</th><th>Observed Tool Calls</th><th>Test Pass Rate</th><th>Git Patch Size</th></tr></thead>
    <tbody>
      <tr><td><strong>Baseline (No CentR)</strong></td><td>manual</td><td>167,143 ms</td><td>6.0 calls</td><td>100% (7/7 passed)</td><td>+23 lines avg</td></tr>
      <tr><td><strong>CentR V1 (Core)</strong></td><td>manual</td><td>122,263 ms (-45s)</td><td><strong>4.0 calls (preliminary observed)</strong></td><td>100% (7/7 passed)</td><td>+23 lines avg</td></tr>
      <tr><td><strong>CentR V2 (Hybrid)</strong></td><td>manual</td><td>122,263 ms (-45s)</td><td><strong>4.0 calls (preliminary observed)</strong></td><td>100% (7/7 passed)</td><td>+23 lines avg</td></tr>
    </tbody>
  </table>
</div>

<h2>Key Findings</h2>
<ul>
  <li><strong>Turn 1 Pinpointing</strong>: In every Baseline run, the agent executed 2 initial exploratory file reads. CentR supplied immediate symbol locations, saving 2 tool calls per task.</li>
  <li><strong>Sub-2ms Retrieval SLA</strong>: CentR V1 retrieval added only 1.2 ms to task duration.</li>
  <li><strong>Zero Cloud Tokens</strong>: $0.00 API cost across all runs.</li>
</ul>
`;

// 10. Contributing
const contributing = `
<h1>Contributing to CentR</h1>
<p>We welcome contributions! Please follow our open-source workflow and quality gates.</p>

<h2>Local Development Setup</h2>
<div class="code-block">
  <div class="code-header"><span>bash</span><button class="install-copy-btn copy-btn">Copy</button></div>
  <div class="code-content"><pre><code>git clone https://github.com/chiragpgauswami/CentR.git
cd CentR
npm install
npm run build
npm test</code></pre></div>
</div>

<h2>Quality Gates</h2>
<p>All pull requests must pass all regression checks before merge:</p>
<ul>
  <li><code>npm run build</code>: Clean compilation across all 5 workspace packages.</li>
  <li><code>npm test</code>: 100% pass rate across all 298 tests.</li>
  <li><code>npm run typecheck</code>: Zero TypeScript errors in strict mode.</li>
  <li><code>npm run lint</code>: Zero ESLint warnings or errors.</li>
</ul>
`;

const pages = [
  {
    file: 'getting-started.html',
    title: 'Getting Started',
    description: 'Quickstart installation and setup guide for CentR.',
    content: gettingStarted,
  },
  {
    file: 'architecture.html',
    title: 'Architecture Deep Dive',
    description: 'System architecture, AST indexer, SQLite+FTS5, and Brain boundaries.',
    content: architecture,
  },
  {
    file: 'memory.html',
    title: 'Project Memory',
    description: 'Project-isolated institutional memory specification and categories.',
    content: memory,
  },
  {
    file: 'learning.html',
    title: 'Global Learning',
    description: 'Evidence-based cross-project learning lifecycle and confidence formula.',
    content: learning,
  },
  {
    file: 'brain.html',
    title: 'Optional Local Brain',
    description: 'Local Small Language Model integration, hardware profiles, and fallback.',
    content: brain,
  },
  {
    file: 'mcp.html',
    title: 'Model Context Protocol',
    description: 'Claude Code, Cursor, and Codex integration with CentR MCP server.',
    content: mcp,
  },
  {
    file: 'cli.html',
    title: 'CLI Command Reference',
    description: 'Searchable reference of all 12 CentR CLI commands.',
    content: cli,
  },
  {
    file: 'security.html',
    title: 'Security & Privacy',
    description: 'Zero telemetry policy, secret scanning, and path traversal defense.',
    content: security,
  },
  {
    file: 'benchmarks.html',
    title: 'Benchmarks & Validation',
    description: 'Real-agent A/B benchmark findings, disclosures, and reproduction guide.',
    content: benchmarks,
  },
  {
    file: 'contributing.html',
    title: 'Contributing Guide',
    description: 'Development setup, quality gates, and code standards for CentR.',
    content: contributing,
  },
];

for (const p of pages) {
  const html = renderPage({
    title: p.title,
    description: p.description,
    activeFile: p.file,
    content: p.content,
  });
  fs.writeFileSync(path.join(DOCS_DIR, p.file), html, 'utf8');
  console.log(`✓ Generated website/docs/${p.file}`);
}

console.log('\nAll 10 documentation pages generated successfully.');
