# CentR V0.1 Implementation Plan

## Completed Features List
- [x] Monorepo setup with `core`, `cli`, `mcp`, and `brain` packages.
- [x] Strict TypeScript configuration and ESM setup.
- [x] SQLite database integration for local storage.
- [x] Basic file indexing and parsing pipeline.
- [x] Keyword search functionality.
- [x] Context engine with token budgeting.
- [x] CLI scaffolding (`init`, `sync`, `search`, `context`).
- [x] Basic project memory storage.
- [x] Basic global learning structure.

## Technology Choices and Rationale
- **TypeScript**: Provides type safety, excellent tooling, and is standard for Node.js development. Strict mode ensures high code quality.
- **Node.js + ESM**: The modern standard for JavaScript runtime. Native ESM allows better interoperability and future-proofing.
- **Monorepo (Workspaces)**: Keeps related packages synchronized, making it easier to develop `core` and `cli` in tandem.
- **SQLite**: Perfect for local, single-user desktop applications. Requires no background service, fast enough for code indexing, and provides robust querying capabilities.
- **Vitest**: Fast, modern testing framework that supports ESM out of the box better than Jest.

## Design Decisions Made
1. **Local-First Processing**: CentR must work entirely offline (excluding remote LLM calls if configured) to ensure privacy and speed.
2. **Separation of Memory and Learning**: Distinct project memory (local to repo) and global learning (local to user machine) to prevent context pollution between unrelated projects.
3. **Token Budgeting**: A hard requirement to prevent Context Window overflow when feeding CentR's output to LLMs.
4. **MCP as a First-Class Citizen**: Model Context Protocol is the future of tool integration for agents. CentR prioritizes an MCP interface alongside the CLI.
