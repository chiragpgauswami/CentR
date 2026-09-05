import {
  computeBenchmarkSummary,
  generateBenchmarkReports,
  getAllTasks,
  getTaskById,
  runBenchmarkSuite,
  type BenchmarkRunRecord,
  type ExecutionMode,
  type ScenarioType,
} from '@centr-ai/benchmark-ab';
import { ContextEngine, SearchEngine, syncProject } from '@centr-ai/core';
import chalk from 'chalk';
import type { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import ora from 'ora';
import { getDatabase, getProjectId, getProjectRoot, handleError } from '../utils.js';

export default function registerBenchmarkCommands(program: Command) {
  const benchCmd = program
    .command('benchmark')
    .description('Run performance benchmarks or real-agent A/B benchmarks')
    .action(async () => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const projectId = getProjectId(db, root);

        const results: any = { name: 'Performance Benchmark' };

        const spinner = ora('Running sync benchmark...').start();
        if (options['json']) spinner.stop();

        const syncRes = await syncProject(projectId, root, db);
        results.indexingTimeMs = syncRes.timeTaken;

        if (!options['json']) spinner.text = 'Running search benchmark...';

        const searchEngine = new SearchEngine(db);
        const tSearchStart = Date.now();
        await searchEngine.search({ query: 'database', projectId, limit: 10 });
        results.searchLatencyMs = Date.now() - tSearchStart;

        if (!options['json']) spinner.text = 'Running context benchmark...';

        const contextEngine = new ContextEngine(db);
        const tContextStart = Date.now();
        const ctxRes = contextEngine.generate({ task: 'fix database connection', projectId });
        results.contextLatencyMs = Date.now() - tContextStart;

        results.estimatedTokens = ctxRes.estimatedTokens;
        results.selectedFiles = ctxRes.items.filter(
          (i: { type: string }) => i.type === 'file',
        ).length;
        results.selectedSymbols = ctxRes.items.filter(
          (i: { type: string }) => i.type === 'symbol',
        ).length;
        results.excludedItems = ctxRes.itemsRemoved;

        if (!options['json']) {
          spinner.succeed(chalk.green('Benchmark complete'));
          console.log('');
          console.log(`Indexing Time: ${chalk.cyan(results.indexingTimeMs + 'ms')}`);
          console.log(`Search Latency: ${chalk.cyan(results.searchLatencyMs + 'ms')}`);
          console.log(`Context Latency: ${chalk.cyan(results.contextLatencyMs + 'ms')}`);
          console.log(`Context Tokens: ${chalk.cyan(results.estimatedTokens)}`);
        } else {
          console.log(JSON.stringify(results, null, 2));
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });

  // 1. centr benchmark agents
  benchCmd
    .command('agents')
    .description('Run real-agent A/B benchmark suite across baseline, V1, and V2')
    .option('-t, --task <id>', 'Task ID to run (e.g. auth-001)')
    .option('-s, --scenario <scenario>', 'Scenario: baseline, centr-v1, centr-v2')
    .option(
      '-a, --agent <agent>',
      'Agent adapter: generic, antigravity, claude-code, codex, cursor',
      'generic',
    )
    .option('-m, --mode <mode>', 'Execution mode: automated, manual, simulated', 'automated')
    .option('-r, --runs <number>', 'Number of runs per scenario/task', '1')
    .option('--smoke', 'Run 3-task smoke test (auth-001, database-001, debugging-001)')
    .option('--results-dir <dir>', 'Directory for JSON run records', 'benchmarks/agent-ab/results')
    .option('--reports-dir <dir>', 'Directory for reports', 'benchmarks/agent-ab/reports')
    .action(async (cmdOptions) => {
      const globalOpts = program.opts();
      const isJson = !!globalOpts['json'];

      try {
        let tasks = getAllTasks();
        if (cmdOptions.smoke) {
          const smokeIds = ['auth-001', 'database-001', 'debugging-001'];
          tasks = tasks.filter((t) => smokeIds.includes(t.id));
        } else if (cmdOptions.task) {
          const task = getTaskById(cmdOptions.task);
          if (!task) {
            console.error(chalk.red(`Error: Task "${cmdOptions.task}" not found.`));
            process.exit(1);
          }
          tasks = [task];
        }

        const scenarios: ScenarioType[] = cmdOptions.scenario
          ? [cmdOptions.scenario as ScenarioType]
          : ['baseline', 'centr-v1', 'centr-v2'];

        const runs = parseInt(cmdOptions.runs, 10) || 1;
        const resultsDir = path.resolve(cmdOptions.resultsDir);
        const reportsDir = path.resolve(cmdOptions.reportsDir);

        if (!isJson) {
          console.log(chalk.bold('\n=== CentR Real-Agent A/B Benchmark ==='));
          console.log(`Tasks:      ${chalk.cyan(tasks.length)}`);
          console.log(`Scenarios:  ${chalk.cyan(scenarios.join(', '))}`);
          console.log(`Agent:      ${chalk.cyan(cmdOptions.agent)} (${cmdOptions.mode})`);
          console.log(`Runs/task:  ${chalk.cyan(runs)}`);
          console.log(`Total runs: ${chalk.cyan(tasks.length * scenarios.length * runs)}\n`);
        }

        const records = await runBenchmarkSuite({
          tasks,
          scenarios,
          agent: cmdOptions.agent,
          executionMode: cmdOptions.mode as ExecutionMode,
          runs,
          resultsDir,
          onProgress: ({ task, scenario, run, record }) => {
            if (!isJson) {
              const statusTag = record.success ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
              console.log(
                `  ${statusTag} [${chalk.bold(task)}] scenario: ${chalk.yellow(scenario)} (run ${run}) in ${record.durationMs}ms`,
              );
            }
          },
        });

        const reportResult = generateBenchmarkReports(records, reportsDir);

        if (isJson) {
          console.log(JSON.stringify(reportResult.summary, null, 2));
        } else {
          console.log(chalk.green(`\nBenchmark completed! (${records.length} runs)`));
          console.log(`Report generated: ${chalk.cyan(reportResult.markdownPath)}`);
          console.log(`Summary JSON:     ${chalk.cyan(reportResult.jsonPath)}\n`);
        }
      } catch (error) {
        handleError(error);
      }
    });

  // 2. centr benchmark record
  benchCmd
    .command('record')
    .description('Record an external or manual agent benchmark execution record')
    .option('-t, --task <id>', 'Task ID (e.g. auth-001)')
    .option('-s, --scenario <scenario>', 'Scenario: baseline, centr-v1, centr-v2')
    .option('-a, --agent <agent>', 'Agent name', 'manual')
    .option('-d, --duration <ms>', 'Duration in milliseconds', '0')
    .option('--tokens <tokens>', 'Total agent tokens used')
    .option('--tool-calls <count>', 'Number of tool calls', '0')
    .option('--files-read <count>', 'Number of files read', '0')
    .option('--repeated-explorations <count>', 'Number of repeated explorations', '0')
    .option('--success', 'Whether the task succeeded', true)
    .option('--no-success', 'Mark the task as failed')
    .option('-f, --file <path>', 'JSON file containing run record or tool events')
    .option('--notes <notes>', 'Optional run notes', '')
    .option('--results-dir <dir>', 'Directory to save record', 'benchmarks/agent-ab/results')
    .action(async (cmdOptions) => {
      const globalOpts = program.opts();
      const isJson = !!globalOpts['json'];

      try {
        const resultsDir = path.resolve(cmdOptions.resultsDir);
        fs.mkdirSync(resultsDir, { recursive: true });

        let record: BenchmarkRunRecord;

        if (cmdOptions.file) {
          const filePath = path.resolve(cmdOptions.file);
          if (!fs.existsSync(filePath)) {
            console.error(chalk.red(`File not found: ${filePath}`));
            process.exit(1);
          }
          const loaded = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          record = loaded as BenchmarkRunRecord;
        } else {
          if (!cmdOptions.task || !cmdOptions.scenario) {
            console.error(
              chalk.red('Error: --task and --scenario are required when --file is not provided.'),
            );
            process.exit(1);
          }

          const task = getTaskById(cmdOptions.task);
          const now = new Date().toISOString();

          record = {
            benchmarkVersion: '1.0.0',
            runId: `manual-${cmdOptions.task}-${cmdOptions.scenario}-${Date.now()}`,
            taskId: cmdOptions.task,
            taskTitle: task ? task.title : cmdOptions.task,
            category: task ? task.category : 'debugging',
            retrievalClass: task ? task.retrievalClass : 'class_1_exact',
            difficulty: task ? task.difficulty : 'easy',
            scenario: cmdOptions.scenario as ScenarioType,
            agent: cmdOptions.agent,
            executionMode: 'manual',
            model: 'manual-agent',
            startedAt: now,
            finishedAt: now,
            durationMs: parseInt(cmdOptions.duration, 10) || 0,
            success: !!cmdOptions.success,
            requiresManualReview: false,
            tests: {
              executed: false,
              passed: cmdOptions.success ? 1 : 0,
              failed: cmdOptions.success ? 0 : 1,
            },
            agentMetrics: {
              totalTokens: cmdOptions.tokens ? parseInt(cmdOptions.tokens, 10) : null,
              inputTokens: null,
              outputTokens: null,
              toolCalls: parseInt(cmdOptions.toolCalls, 10) || 0,
              filesRead: parseInt(cmdOptions.filesRead, 10) || 0,
              filesModified: 0,
              filesCreated: 0,
              repeatedExplorationCount: parseInt(cmdOptions.repeatedExplorations, 10) || 0,
              patchSizeLines: 0,
            },
            centrMetrics: {
              enabled: cmdOptions.scenario !== 'baseline',
              contextTokens: null,
              latencyMs: null,
              brainCalls: 0,
              brainLatencyMs: 0,
              fallbacks: 0,
              cacheHits: 0,
            },
            failureReasons: cmdOptions.success ? [] : ['Manual mark failed'],
          };
        }

        const outPath = path.join(resultsDir, `${record.runId}.json`);
        fs.writeFileSync(outPath, JSON.stringify(record, null, 2), 'utf8');

        if (isJson) {
          console.log(
            JSON.stringify({ recorded: true, path: outPath, runId: record.runId }, null, 2),
          );
        } else {
          console.log(chalk.green(`✓ Benchmark run recorded successfully!`));
          console.log(`  Run ID:    ${chalk.cyan(record.runId)}`);
          console.log(`  Task:      ${chalk.bold(record.taskId)}`);
          console.log(`  Scenario:  ${chalk.yellow(record.scenario)}`);
          console.log(`  File:      ${chalk.cyan(outPath)}`);
        }
      } catch (error) {
        handleError(error);
      }
    });

  // 3. centr benchmark report
  benchCmd
    .command('report')
    .description('Generate summary report from recorded benchmark results')
    .option('--results-dir <dir>', 'Directory with JSON run records', 'benchmarks/agent-ab/results')
    .option('--reports-dir <dir>', 'Directory to write reports', 'benchmarks/agent-ab/reports')
    .action(async (cmdOptions) => {
      const globalOpts = program.opts();
      const isJson = !!globalOpts['json'];

      try {
        const resultsDir = path.resolve(cmdOptions.resultsDir);
        const reportsDir = path.resolve(cmdOptions.reportsDir);

        if (!fs.existsSync(resultsDir)) {
          console.error(chalk.yellow(`Results directory does not exist: ${resultsDir}`));
          process.exit(0);
        }

        const files = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.json'));
        if (files.length === 0) {
          console.log(chalk.yellow(`No benchmark result records found in ${resultsDir}`));
          process.exit(0);
        }

        const records: BenchmarkRunRecord[] = files.map((f) =>
          JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8')),
        );

        const gen = generateBenchmarkReports(records, reportsDir);

        if (isJson) {
          console.log(JSON.stringify(gen.summary, null, 2));
        } else {
          console.log(chalk.bold('\n=== CentR A/B Benchmark Summary ==='));
          console.log(`Total Records: ${chalk.cyan(records.length)}`);
          console.log('');
          for (const [sc, stats] of Object.entries(gen.summary.scenarios)) {
            console.log(
              `  ${chalk.bold(sc.padEnd(12))}: ${stats.successfulRuns}/${stats.totalRuns} passed (${stats.successRate}%) | avg ${stats.averageDurationMs}ms | avg ${stats.averageToolCalls} tool calls | avg ${stats.averageRepeatedExplorations} repeated`,
            );
          }
          console.log('');
          console.log(`Report generated: ${chalk.cyan(gen.markdownPath)}`);
          console.log(`Summary JSON:     ${chalk.cyan(gen.jsonPath)}\n`);
        }
      } catch (error) {
        handleError(error);
      }
    });

  // 4. centr benchmark compare
  benchCmd
    .command('compare')
    .description('Compare scenarios or specific benchmark runs')
    .option('--results-dir <dir>', 'Directory with JSON run records', 'benchmarks/agent-ab/results')
    .option('--file-a <path>', 'First run record JSON file')
    .option('--file-b <path>', 'Second run record JSON file')
    .action(async (cmdOptions) => {
      const globalOpts = program.opts();
      const isJson = !!globalOpts['json'];

      try {
        if (cmdOptions.fileA && cmdOptions.fileB) {
          const recA: BenchmarkRunRecord = JSON.parse(
            fs.readFileSync(path.resolve(cmdOptions.fileA), 'utf8'),
          );
          const recB: BenchmarkRunRecord = JSON.parse(
            fs.readFileSync(path.resolve(cmdOptions.fileB), 'utf8'),
          );

          const comparison = {
            runA: {
              runId: recA.runId,
              taskId: recA.taskId,
              scenario: recA.scenario,
              success: recA.success,
              durationMs: recA.durationMs,
              toolCalls: recA.agentMetrics.toolCalls,
              repeatedExplorations: recA.agentMetrics.repeatedExplorationCount,
              tokens: recA.agentMetrics.totalTokens,
            },
            runB: {
              runId: recB.runId,
              taskId: recB.taskId,
              scenario: recB.scenario,
              success: recB.success,
              durationMs: recB.durationMs,
              toolCalls: recB.agentMetrics.toolCalls,
              repeatedExplorations: recB.agentMetrics.repeatedExplorationCount,
              tokens: recB.agentMetrics.totalTokens,
            },
            delta: {
              durationMs: recB.durationMs - recA.durationMs,
              toolCalls:
                recB.agentMetrics.toolCalls !== null && recA.agentMetrics.toolCalls !== null
                  ? recB.agentMetrics.toolCalls - recA.agentMetrics.toolCalls
                  : null,
              repeatedExplorations:
                recB.agentMetrics.repeatedExplorationCount !== null &&
                recA.agentMetrics.repeatedExplorationCount !== null
                  ? recB.agentMetrics.repeatedExplorationCount -
                    recA.agentMetrics.repeatedExplorationCount
                  : null,
            },
          };

          if (isJson) {
            console.log(JSON.stringify(comparison, null, 2));
          } else {
            console.log(chalk.bold('\n=== Run Comparison ==='));
            console.log(`Task: ${chalk.bold(recA.taskId)}`);
            console.log(
              `Run A: ${chalk.yellow(recA.scenario)} (${recA.runId}) - ${recA.durationMs}ms, ${recA.agentMetrics.toolCalls} tools`,
            );
            console.log(
              `Run B: ${chalk.cyan(recB.scenario)} (${recB.runId}) - ${recB.durationMs}ms, ${recB.agentMetrics.toolCalls} tools`,
            );
            console.log(
              `Delta (B - A): duration ${comparison.delta.durationMs}ms, tools ${comparison.delta.toolCalls}\n`,
            );
          }
          return;
        }

        // Aggregate comparison across results directory
        const resultsDir = path.resolve(cmdOptions.resultsDir);
        if (!fs.existsSync(resultsDir)) {
          console.error(chalk.yellow(`Results directory does not exist: ${resultsDir}`));
          process.exit(0);
        }

        const files = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.json'));
        if (files.length === 0) {
          console.log(chalk.yellow(`No records found in ${resultsDir}`));
          process.exit(0);
        }

        const records: BenchmarkRunRecord[] = files.map((f) =>
          JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8')),
        );

        const summary = computeBenchmarkSummary(records);

        if (isJson) {
          console.log(JSON.stringify(summary, null, 2));
        } else {
          console.log(chalk.bold('\n=== CentR Scenario Comparison (Aggregate) ==='));
          console.log(`Total Records: ${chalk.cyan(records.length)}\n`);

          console.log(chalk.bold('Per-Scenario Aggregates:'));
          for (const [sc, s] of Object.entries(summary.scenarios)) {
            console.log(
              `  ${chalk.yellow(sc.padEnd(12))}: Success: ${s.successRate}% | Avg Duration: ${s.averageDurationMs}ms | Avg Tool Calls: ${s.averageToolCalls} | Avg Repeated Reads: ${s.averageRepeatedExplorations}`,
            );
          }

          console.log(chalk.bold('\nPaired Deltas:'));
          const deltas = summary.pairedDeltas;
          console.log(`  V1 vs Baseline:`);
          console.log(
            `    Success Rate: ${deltas.v1MinusBaseline.successRateDiff > 0 ? '+' : ''}${deltas.v1MinusBaseline.successRateDiff}%`,
          );
          console.log(`    Duration:     ${deltas.v1MinusBaseline.durationMsDiff}ms`);
          console.log(`    Tool Calls:   ${deltas.v1MinusBaseline.toolCallsDiff}`);
          console.log(`    Repeated:     ${deltas.v1MinusBaseline.repeatedExplorationDiff}`);

          console.log(`  V2 vs Baseline:`);
          console.log(
            `    Success Rate: ${deltas.v2MinusBaseline.successRateDiff > 0 ? '+' : ''}${deltas.v2MinusBaseline.successRateDiff}%`,
          );
          console.log(`    Duration:     ${deltas.v2MinusBaseline.durationMsDiff}ms`);
          console.log(`    Tool Calls:   ${deltas.v2MinusBaseline.toolCallsDiff}`);
          console.log(`    Repeated:     ${deltas.v2MinusBaseline.repeatedExplorationDiff}`);

          console.log(`  V2 vs V1:`);
          console.log(
            `    Success Rate: ${deltas.v2MinusV1.successRateDiff > 0 ? '+' : ''}${deltas.v2MinusV1.successRateDiff}%`,
          );
          console.log(`    Duration:     ${deltas.v2MinusV1.durationMsDiff}ms`);
          console.log(`    Tool Calls:   ${deltas.v2MinusV1.toolCallsDiff}`);
          console.log(`    Repeated:     ${deltas.v2MinusV1.repeatedExplorationDiff}\n`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
