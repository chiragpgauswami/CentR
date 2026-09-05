#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import type { ExecutionMode } from './agents/types.js';
import { generateBenchmarkReports } from './reports/generator.js';
import { runBenchmarkSuite } from './runner/index.js';
import type { ScenarioType } from './scenarios/types.js';
import { getAllTasks, getTaskById } from './tasks/index.js';

export async function runCli(): Promise<void> {
  const args = process.argv.slice(2);

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const hasFlag = (flag: string): boolean => args.includes(flag);

  const taskId = getArg('--task');
  const scenarioArg = getArg('--scenario') as ScenarioType | undefined;
  const agentArg = getArg('--agent') || 'generic';
  const modeArg = (getArg('--mode') || 'automated') as ExecutionMode;
  const runsArg = parseInt(getArg('--runs') || '1', 10);
  const isSmoke = hasFlag('--smoke');
  const isJson = hasFlag('--json');
  const onlyReport = hasFlag('--report');

  const resultsDir = path.resolve('benchmarks/agent-ab/results');
  const reportsDir = path.resolve('benchmarks/agent-ab/reports');

  if (onlyReport) {
    // Generate report from existing results
    if (!fs.existsSync(resultsDir)) {
      console.error('No results directory found.');
      process.exit(1);
    }
    const files = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.json'));
    const records = files.map((f) => JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8')));
    const gen = generateBenchmarkReports(records, reportsDir);
    if (isJson) {
      console.log(JSON.stringify(gen.summary, null, 2));
    } else {
      console.log(`\nReport generated: ${gen.markdownPath}\n`);
    }
    return;
  }

  // Select tasks
  let tasks = getAllTasks();
  if (isSmoke) {
    const smokeIds = ['auth-001', 'database-001', 'debugging-001'];
    tasks = tasks.filter((t) => smokeIds.includes(t.id));
  } else if (taskId) {
    const single = getTaskById(taskId);
    if (!single) {
      console.error(`Task "${taskId}" not found.`);
      process.exit(1);
    }
    tasks = [single];
  }

  // Select scenarios
  const scenarios: ScenarioType[] = scenarioArg
    ? [scenarioArg]
    : ['baseline', 'centr-v1', 'centr-v2'];

  if (!isJson) {
    console.log(`\nStarting CentR Agent A/B Benchmark`);
    console.log(`Tasks:     ${tasks.length}`);
    console.log(`Scenarios: ${scenarios.join(', ')}`);
    console.log(`Agent:     ${agentArg} (${modeArg})`);
    console.log(`Runs:      ${runsArg}\n`);
  }

  const records = await runBenchmarkSuite({
    tasks,
    scenarios,
    agent: agentArg,
    executionMode: modeArg,
    runs: runsArg,
    resultsDir,
    onProgress: ({ task, scenario, run, record }) => {
      if (!isJson) {
        const status = record.success ? 'PASS' : 'FAIL';
        console.log(
          `[${status}] Task: ${task} | Scenario: ${scenario} | Run: ${run} (${record.durationMs}ms)`,
        );
      }
    },
  });

  const reportResult = generateBenchmarkReports(records, reportsDir);

  if (isJson) {
    console.log(JSON.stringify(reportResult.summary, null, 2));
  } else {
    console.log(`\nBenchmark Completed Successfully!`);
    console.log(`Total Runs:  ${records.length}`);
    console.log(`Report:      ${reportResult.markdownPath}\n`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('cli.js')) {
  runCli().catch((err) => {
    console.error('Benchmark execution error:', err);
    process.exit(1);
  });
}
