#!/usr/bin/env node
import { createBrainProvider } from '@centr-ai/brain';
import {
  CENTR_DIR,
  CentrDatabase,
  ContextEngine,
  LearningService,
  SearchEngine,
  SkillsService,
  loadConfig,
} from '@centr-ai/core';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ToolInput {
  [key: string]: unknown;
}

function validateString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid argument: ${name} must be a non-empty string`);
  }
  if (value.length > 10000) {
    throw new Error(`Invalid argument: ${name} exceeds maximum length`);
  }
  if ((value as string).includes('\0')) {
    throw new Error(`Invalid argument: ${name} contains invalid characters`);
  }
  return value.trim();
}

function validateNumber(value: unknown, name: string, min = 0, max = 100000): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num) || num < min || num > max) {
    throw new Error(`Invalid argument: ${name} must be a number between ${min} and ${max}`);
  }
  return num;
}

function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, CENTR_DIR))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error('No CentR project found. Run "centr init" first.');
}

function getDb(root: string): CentrDatabase {
  const config = loadConfig(root);
  const dbPath = path.resolve(root, config.database.path);
  const db = new CentrDatabase(dbPath);
  db.initialize();
  return db;
}

function getProjectId(db: CentrDatabase, root: string): number {
  const row = db.getDb().prepare('SELECT id FROM projects WHERE rootPath = ?').get(root) as
    { id: number } | undefined;
  if (!row) {
    throw new Error('Project not found in database. Run "centr init" first.');
  }
  return row.id;
}

const TOOLS = [
  {
    name: 'project_status',
    description:
      'Get current project status including files, symbols, dependencies, and last sync time.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'project_search',
    description:
      'Search project code, symbols, and files. Returns relevant matches ranked by relevance.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Maximum results (default 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'project_context',
    description:
      'Generate task-relevant project context with token budgeting. Returns the minimal set of relevant files, symbols, memory, and learning needed for a task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'Task description' },
        maxTokens: {
          type: 'number',
          description: 'Maximum context tokens (default 4000)',
        },
        includeMemory: {
          type: 'boolean',
          description: 'Include project memory (default true)',
        },
        includeLearning: {
          type: 'boolean',
          description: 'Include global learning (default true)',
        },
        includeSkills: {
          type: 'boolean',
          description: 'Include skills (default true)',
        },
        useBrain: {
          type: 'boolean',
          description: 'Enable Brain SLM hybrid ranking (default: uses config.brain.enabled)',
        },
      },
      required: ['task'],
    },
  },
  {
    name: 'project_symbol',
    description:
      'Look up a specific symbol (function, class, type, etc.) and get its details, file location, and references.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Symbol name to look up' },
      },
      required: ['name'],
    },
  },
  {
    name: 'project_dependencies',
    description: 'List or search project dependencies.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Optional search query to filter dependencies',
        },
      },
    },
  },
  {
    name: 'project_architecture',
    description:
      'Get project architecture overview including languages, framework, entry points, directory structure, and key patterns.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'learning_search',
    description:
      'Search global learning database for relevant engineering lessons, debugging patterns, and best practices.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Maximum results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'learning_record',
    description:
      'Record a new engineering lesson or debugging pattern from a development experience.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        lesson: { type: 'string', description: 'The lesson learned' },
        category: {
          type: 'string',
          description:
            'Category (debugging, performance, security, architecture, testing, dependency, workflow)',
        },
        trigger: {
          type: 'string',
          description: 'What triggers this lesson to be relevant',
        },
        recommendedAction: {
          type: 'string',
          description: 'Recommended action when this lesson applies',
        },
        sourceExperience: {
          type: 'string',
          description: 'The experience that led to this lesson',
        },
      },
      required: ['lesson', 'category', 'trigger', 'recommendedAction', 'sourceExperience'],
    },
  },
  {
    name: 'skill_search',
    description: 'Search for relevant skills and reusable development strategies.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Maximum results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'brain_analyze_failure',
    description:
      'Analyze an error or failure using Brain reasoning to categorize root cause, suggest fixes, and identify affected files.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'Task that was being attempted' },
        attemptedChange: { type: 'string', description: 'What change or action was attempted' },
        error: { type: 'string', description: 'Error message or failure output' },
        testOutput: { type: 'string', description: 'Optional test output or stack trace' },
      },
      required: ['task', 'error'],
    },
  },
];

async function handleTool(
  name: string,
  args: ToolInput,
  explicitRoot?: string,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const root = explicitRoot || findProjectRoot();
  const db = getDb(root);

  try {
    const projectId = getProjectId(db, root);
    const searchEngine = new SearchEngine(db);
    const contextEngine = new ContextEngine(db);
    const learningService = new LearningService(db);
    const skillsService = new SkillsService(db);

    let result: unknown;

    switch (name) {
      case 'project_status': {
        const project = db
          .getDb()
          .prepare('SELECT * FROM projects WHERE id = ?')
          .get(projectId) as Record<string, unknown>;
        const fileCount = (
          db
            .getDb()
            .prepare('SELECT COUNT(*) as count FROM files WHERE projectId = ?')
            .get(projectId) as { count: number }
        ).count;
        const symbolCount = (
          db
            .getDb()
            .prepare('SELECT COUNT(*) as count FROM symbols WHERE projectId = ?')
            .get(projectId) as { count: number }
        ).count;
        const depCount = (
          db
            .getDb()
            .prepare('SELECT COUNT(*) as count FROM dependencies WHERE projectId = ?')
            .get(projectId) as { count: number }
        ).count;
        const testCount = (
          db
            .getDb()
            .prepare('SELECT COUNT(*) as count FROM files WHERE projectId = ? AND isTest = 1')
            .get(projectId) as { count: number }
        ).count;

        result = {
          project: {
            name: project['name'],
            language: project['language'],
            framework: project['framework'],
            packageManager: project['packageManager'],
          },
          counts: {
            files: fileCount,
            symbols: symbolCount,
            dependencies: depCount,
            tests: testCount,
          },
          lastUpdated: project['updatedAt'],
        };
        break;
      }

      case 'project_search': {
        const query = validateString(args['query'], 'query');
        const limit = args['limit'] ? validateNumber(args['limit'], 'limit', 1, 100) : 10;
        result = searchEngine.search({ query, projectId, limit });
        break;
      }

      case 'project_context': {
        const task = validateString(args['task'], 'task');
        const maxTokens = args['maxTokens']
          ? validateNumber(args['maxTokens'], 'maxTokens', 100, 50000)
          : 4000;
        const config = loadConfig(root);
        const shouldRunBrain =
          args['useBrain'] !== undefined
            ? Boolean(args['useBrain'])
            : Boolean(config.brain?.enabled);

        const request = {
          task,
          projectId,
          maxTokens,
          includeMemory: args['includeMemory'] !== false,
          includeLearning: args['includeLearning'] !== false,
          includeSkills: args['includeSkills'] !== false,
          useBrain: shouldRunBrain,
        };

        if (shouldRunBrain && config.brain?.enabled) {
          const brainProvider = createBrainProvider({
            enabled: config.brain.enabled,
            provider: config.brain.provider,
            model: config.brain.model,
            timeoutMs: config.brain.timeoutMs,
            endpoint: config.brain.endpoint,
          });
          contextEngine.setBrain(brainProvider);
          result = await contextEngine.generateWithBrain(request);
        } else {
          result = contextEngine.generate(request);
        }
        break;
      }

      case 'project_symbol': {
        const symbolName = validateString(args['name'], 'name');
        result = searchEngine.lookupSymbol(projectId, symbolName);
        if (!result) {
          result = {
            error: `Symbol '${symbolName}' not found`,
            suggestions: searchEngine.searchSymbols(projectId, symbolName, 5),
          };
        }
        break;
      }

      case 'project_dependencies': {
        const query = args['query'] ? validateString(args['query'], 'query') : null;
        if (query) {
          result = searchEngine.searchDependencies(projectId, query);
        } else {
          result = db
            .getDb()
            .prepare('SELECT name, version, isDev, isPeer FROM dependencies WHERE projectId = ?')
            .all(projectId);
        }
        break;
      }

      case 'project_architecture': {
        const project = db
          .getDb()
          .prepare('SELECT * FROM projects WHERE id = ?')
          .get(projectId) as Record<string, unknown>;
        const entryPoints = db
          .getDb()
          .prepare('SELECT relativePath FROM files WHERE projectId = ? AND isEntryPoint = 1')
          .all(projectId) as Array<{ relativePath: string }>;
        const languages = db
          .getDb()
          .prepare(
            'SELECT language, COUNT(*) as count FROM files WHERE projectId = ? GROUP BY language ORDER BY count DESC',
          )
          .all(projectId) as Array<{ language: string; count: number }>;
        const topDirs = db
          .getDb()
          .prepare(
            `SELECT SUBSTR(relativePath, 1, INSTR(relativePath || '/', '/') - 1) as dir, COUNT(*) as count FROM files WHERE projectId = ? GROUP BY dir ORDER BY count DESC LIMIT 20`,
          )
          .all(projectId) as Array<{ dir: string; count: number }>;

        result = {
          project: {
            name: project['name'],
            language: project['language'],
            framework: project['framework'],
            packageManager: project['packageManager'],
            description: project['description'],
          },
          entryPoints: entryPoints.map((e) => e.relativePath),
          languages: languages.map((l) => ({
            language: l.language,
            files: l.count,
          })),
          directories: topDirs.map((d) => ({ name: d.dir, files: d.count })),
        };
        break;
      }

      case 'learning_search': {
        const query = validateString(args['query'], 'query');
        const limit = args['limit'] ? validateNumber(args['limit'], 'limit', 1, 50) : 5;
        result = learningService.search(query, limit);
        break;
      }

      case 'learning_record': {
        const lesson = validateString(args['lesson'], 'lesson');
        const category = validateString(args['category'], 'category');
        const trigger = validateString(args['trigger'], 'trigger');
        const recommendedAction = validateString(args['recommendedAction'], 'recommendedAction');
        const sourceExperience = validateString(args['sourceExperience'], 'sourceExperience');
        result = learningService.record({
          lesson,
          category,
          trigger,
          recommendedAction,
          scope: 'global',
          sourceExperience,
        });
        break;
      }

      case 'skill_search': {
        const query = validateString(args['query'], 'query');
        const limit = args['limit'] ? validateNumber(args['limit'], 'limit', 1, 50) : 5;
        result = skillsService.search(query, limit);
        break;
      }

      case 'brain_analyze_failure': {
        const task = validateString(args['task'], 'task');
        const attemptedChange = args['attemptedChange']
          ? validateString(args['attemptedChange'], 'attemptedChange')
          : 'Task execution';
        const error = validateString(args['error'], 'error');
        const testOutput = args['testOutput']
          ? validateString(args['testOutput'], 'testOutput')
          : undefined;
        const config = loadConfig(root);
        const brainProvider = createBrainProvider({
          enabled: true,
          provider: config.brain?.provider || 'none',
          model: config.brain?.model,
          timeoutMs: config.brain?.timeoutMs,
          endpoint: config.brain?.endpoint,
        });
        result = await brainProvider.analyzeFailure({ task, attemptedChange, error, testOutput });
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } finally {
    db.close();
  }
}

export async function startMcpServer(): Promise<void> {
  const server = new Server(
    {
      name: 'centr',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      return await handleTool(name, (args as ToolInput) || {});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export { TOOLS, handleTool };

// Start server when run directly as CLI entry
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startMcpServer().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
