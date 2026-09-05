# CentR: AI Agent Project Guide

Welcome AI Coding Agents! This document provides an overview of the CentR project structure, guidelines, and commands.

## Project Description

CentR is Project Intelligence + Learning Middleware for AI Coding Agents. It reduces repeated repository exploration by providing task-relevant project intelligence, project memory, and global learning patterns.

## Repository Structure Overview

This is a monorepo structure.

```
centr/
├── packages/
│   ├── core/      # Core logic, indexer, search, context, memory, learning
│   ├── cli/       # Command Line Interface (centr commands)
│   ├── mcp/       # Model Context Protocol integration
│   └── brain/     # Abstractions for connecting to local/remote LLMs for embedding/generation
├── docs/          # Detailed documentation
├── AGENTS.md      # This file
└── README.md      # Main project README
```

## Package Descriptions

- **core**: The heart of CentR. Handles parsing files, indexing code, building context, and managing the SQLite database for storage.
- **cli**: Exposes the `centr` CLI. Uses `core` under the hood.
- **mcp**: Integration for Model Context Protocol, allowing tools like Claude Code and Codex to interface with CentR seamlessly.
- **brain**: Connects CentR to LLM providers (OpenAI, Anthropic, local Llama) to generate embeddings for semantic search and to extract learning patterns.

## Key Commands

Run these from the repository root:

- `npm run build`: Build all packages (TypeScript to JavaScript).
- `npm run test`: Run all tests.
- `npm run lint`: Run ESLint.
- `npm run typecheck`: Run TypeScript compiler checks without emitting files.

## Testing Guidelines

- Use Vitest for testing.
- Place test files next to the implementation or in a `__tests__` directory.
- Aim for high test coverage on core parsing and logic modules.
- Mock database connections where necessary or use an in-memory SQLite database.

## Architecture Notes

- CentR relies heavily on SQLite for fast, local data storage of indexes, project memory, and global learning patterns.
- Context generation uses a token budgeting approach to ensure context windows are respected.
- See `docs/ARCHITECTURE.md` for in-depth details.

## Important Conventions

- **ESM**: Use ECMAScript Modules everywhere.
- **Strict TypeScript**: Strict mode is enabled and must be followed. Avoid `any` types.
- **.js imports**: In TypeScript files using Node16 module resolution, imports must include the `.js` extension (e.g., `import { X } from './X.js'`).
- **Parameterized SQL**: Always use parameterized queries or an ORM/query builder to prevent SQL injection and ensure stability.
