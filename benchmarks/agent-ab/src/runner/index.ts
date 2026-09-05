import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getAgentAdapter } from '../agents/index.js';
import type { ExecutionMode } from '../agents/types.js';
import { ObjectiveEvaluator } from '../evaluator/index.js';
import { calculateRepeatedExploration } from '../metrics/repeated-exploration.js';
import type { BenchmarkRunRecord } from '../metrics/types.js';
import { getScenarioPreparer } from '../scenarios/index.js';
import type { ScenarioType } from '../scenarios/types.js';
import type { BenchmarkTask } from '../tasks/types.js';
import { createIsolatedWorkspace } from './isolation.js';

export * from './isolation.js';

export interface BenchmarkRunOptions {
  task: BenchmarkTask;
  scenario: ScenarioType;
  agent: string;
  executionMode?: ExecutionMode;
  fixturePath?: string;
  brainProvider?: string;
  brainProfile?: string;
  model?: string;
  timeoutMs?: number;
}

export interface BenchmarkSuiteOptions {
  tasks: BenchmarkTask[];
  scenarios: ScenarioType[];
  agent: string;
  executionMode?: ExecutionMode;
  runs?: number;
  fixturePath?: string;
  brainProvider?: string;
  brainProfile?: string;
  resultsDir?: string;
  onProgress?: (info: {
    task: string;
    scenario: ScenarioType;
    run: number;
    record: BenchmarkRunRecord;
  }) => void;
}

export async function runBenchmarkTask(options: BenchmarkRunOptions): Promise<BenchmarkRunRecord> {
  const startedAt = new Date().toISOString();
  const runId = `run-${options.task.id}-${options.scenario}-${crypto.randomUUID().slice(0, 6)}`;
  const defaultFixture = path.resolve('fixtures/sample-project');
  const fixturePath = options.fixturePath || defaultFixture;

  const { workspaceDir, cleanup } = createIsolatedWorkspace(fixturePath);
  const evaluator = new ObjectiveEvaluator();

  try {
    // 1. Prepare Scenario (Baseline, CentR V1, or CentR V2)
    const scenarioPreparer = getScenarioPreparer(options.scenario);
    const scenarioContext = await scenarioPreparer.prepare(workspaceDir, options.task.prompt, {
      brainProvider: options.brainProvider,
      brainProfile: options.brainProfile,
    });

    // 2. Execute Agent
    const agentAdapter = getAgentAdapter(options.agent);
    const agentResult = await agentAdapter.runTask({
      taskId: options.task.id,
      taskPrompt: options.task.prompt,
      scenario: scenarioContext,
      workingDir: workspaceDir,
      mode: options.executionMode || 'automated',
      timeoutMs: options.timeoutMs,
    });

    // 3. Objective Evaluation
    const evaluation = evaluator.evaluate(workspaceDir, options.task);

    // 4. Repeated Exploration Heuristic
    const repeated = calculateRepeatedExploration(agentResult.toolEvents);

    const finishedAt = new Date().toISOString();
    const patchLines = agentResult.patch ? agentResult.patch.split('\n').length : 0;

    const record: BenchmarkRunRecord = {
      benchmarkVersion: '1.0',
      runId,
      taskId: options.task.id,
      taskTitle: options.task.title,
      category: options.task.category,
      retrievalClass: options.task.retrievalClass,
      difficulty: options.task.difficulty,
      scenario: options.scenario,
      agent: options.agent,
      executionMode: agentResult.executionMode,
      model: options.model || (options.scenario === 'centr-v2' ? 'qwen2.5:1.5b' : 'none'),
      startedAt,
      finishedAt,
      durationMs: agentResult.durationMs + (scenarioContext.centrLatencyMs || 0),
      timing: {
        agentExecutionMs: agentResult.durationMs,
        centrLatencyMs: scenarioContext.centrLatencyMs ?? null,
        totalWallClockMs: agentResult.durationMs + (scenarioContext.centrLatencyMs || 0),
      },
      success: evaluation.success && agentResult.success,
      requiresManualReview: evaluation.requiresManualReview,
      tests: {
        executed: evaluation.testsExecuted,
        passed: evaluation.testsPassedCount,
        failed: evaluation.testsFailedCount,
      },
      agentMetrics: {
        toolCalls: agentResult.toolCalls,
        filesRead: agentResult.filesRead.length,
        filesModified: agentResult.filesModified.length,
        filesCreated: agentResult.filesCreated.length,
        inputTokens: agentResult.inputTokens,
        outputTokens: agentResult.outputTokens,
        totalTokens: agentResult.totalTokens,
        repeatedExplorationCount: repeated.totalRepeatedExplorations,
        patchSizeLines: patchLines,
      },
      centrMetrics: {
        enabled: scenarioContext.centrEnabled,
        contextItems: scenarioContext.contextResult?.items.length ?? 0,
        contextTokens: scenarioContext.centrTokens ?? null,
        latencyMs: scenarioContext.centrLatencyMs ?? null,
        candidateCount: scenarioContext.contextResult?.items.length,
        selectedCount: scenarioContext.contextResult?.itemsSelected,
        brainCalls: scenarioContext.brainMetrics?.calls ?? 0,
        brainLatencyMs: scenarioContext.brainMetrics?.latencyMs ?? 0,
        cacheHits: scenarioContext.brainMetrics?.cacheHits ?? 0,
        fallbacks: scenarioContext.brainMetrics?.fallbacks ?? 0,
      },
      failureReasons: evaluation.failureReasons.length > 0 ? evaluation.failureReasons : undefined,
    };

    return record;
  } finally {
    cleanup();
  }
}

export async function runBenchmarkSuite(
  options: BenchmarkSuiteOptions,
): Promise<BenchmarkRunRecord[]> {
  const records: BenchmarkRunRecord[] = [];
  const repeatCount = options.runs || 1;
  const resultsDir = options.resultsDir || path.resolve('benchmarks/agent-ab/results');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  for (const task of options.tasks) {
    for (const scenario of options.scenarios) {
      for (let run = 1; run <= repeatCount; run++) {
        const record = await runBenchmarkTask({
          task,
          scenario,
          agent: options.agent,
          executionMode: options.executionMode,
          fixturePath: options.fixturePath,
          brainProvider: options.brainProvider,
          brainProfile: options.brainProfile,
        });

        records.push(record);

        // Save individual record JSON
        const recordPath = path.join(resultsDir, `${record.runId}.json`);
        fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf8');

        if (options.onProgress) {
          options.onProgress({ task: task.id, scenario, run, record });
        }
      }
    }
  }

  return records;
}
