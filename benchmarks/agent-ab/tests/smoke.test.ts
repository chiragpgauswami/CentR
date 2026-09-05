import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateBenchmarkReports } from '../src/reports/index.js';
import { runBenchmarkSuite } from '../src/runner/index.js';
import { getTaskById } from '../src/tasks/index.js';

describe('Smoke Benchmark Integration (3 tasks x 3 scenarios = 9 runs)', () => {
  const smokeTaskIds = ['auth-001', 'database-001', 'debugging-001'];
  const tasks = smokeTaskIds.map((id) => {
    const t = getTaskById(id);
    if (!t) throw new Error(`Task ${id} not found in dataset`);
    return t;
  });

  const testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-smoke-test-'));
  const resultsDir = path.join(testTempDir, 'results');
  const reportsDir = path.join(testTempDir, 'reports');

  it('successfully executes 9 scenario runs and generates valid markdown and JSON reports', async () => {
    const progressEvents: string[] = [];

    const records = await runBenchmarkSuite({
      tasks,
      scenarios: ['baseline', 'centr-v1', 'centr-v2'],
      agent: 'generic',
      executionMode: 'automated',
      runs: 1,
      resultsDir,
      onProgress: ({ task, scenario, run, record }) => {
        progressEvents.push(`${task}:${scenario}:${run}:${record.success}`);
      },
    });

    expect(records.length).toBe(9);
    expect(progressEvents.length).toBe(9);

    // Verify all 9 records exist on disk in resultsDir
    const resultFiles = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.json'));
    expect(resultFiles.length).toBe(9);

    // Verify report generation
    const reportResult = generateBenchmarkReports(records, reportsDir);
    expect(fs.existsSync(reportResult.markdownPath)).toBe(true);
    expect(fs.existsSync(reportResult.jsonPath)).toBe(true);

    const reportContent = fs.readFileSync(reportResult.markdownPath, 'utf8');
    expect(reportContent).toContain('# CentR Agent A/B Benchmark Report');
    expect(reportContent).toContain('What We Can Actually Claim');
    expect(reportContent).toContain('Executive Summary');

    const summary = reportResult.summary;
    expect(summary.totalRecords).toBe(9);
    expect(summary.scenarios.baseline.totalRuns).toBe(3);
    expect(summary.scenarios['centr-v1'].totalRuns).toBe(3);
    expect(summary.scenarios['centr-v2'].totalRuns).toBe(3);
  }, 30000);
});
