import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('CentR CLI Integration Tests', () => {
  let tmpDir: string;
  const cliBin = path.resolve('packages/cli/dist/index.js');
  const fixturePath = path.resolve('fixtures/sample-project');

  function runCli(args: string[], cwd: string = tmpDir): string {
    return execFileSync('node', [cliBin, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    });
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-cli-test-'));
    // Copy sample project to tmpDir
    fs.cpSync(fixturePath, tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs --help and displays available commands', () => {
    const out = runCli(['--help']);
    expect(out).toContain('init');
    expect(out).toContain('status');
    expect(out).toContain('search');
    expect(out).toContain('context');
    expect(out).toContain('symbol');
    expect(out).toContain('sync');
    expect(out).toContain('learn');
    expect(out).toContain('skills');
    expect(out).toContain('doctor');
    expect(out).toContain('benchmark');
    expect(out).toContain('brain');
  });

  it('runs --version and outputs version number', () => {
    const out = runCli(['--version']).trim();
    expect(out).toBe('0.1.0');
  });

  it('runs centr init and creates .centr directory with db', () => {
    const out = runCli(['init']);
    expect(out).toContain('Project intelligence is ready');
    expect(out).toContain('sample-project');
    expect(out).toContain('Files indexed');

    expect(fs.existsSync(path.join(tmpDir, '.centr'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.centr/centr.db'))).toBe(true);
  });

  it('runs centr init with --json', () => {
    const out = runCli(['--json', 'init']);
    const parsed = JSON.parse(out);
    expect(parsed.project.name).toBe('sample-project');
    expect(parsed.filesIndexed).toBeGreaterThan(0);
    expect(parsed.symbolsIndexed).toBeGreaterThan(0);
  });

  it('runs centr status after init', () => {
    runCli(['init']);
    const out = runCli(['status']);
    expect(out).toContain('Project:');
    expect(out).toContain('sample-project');
    expect(out).toContain('Files indexed:');
    expect(out).toContain('Symbols indexed:');
  });

  it('runs centr status with --json', () => {
    runCli(['init']);
    const out = runCli(['--json', 'status']);
    const parsed = JSON.parse(out);
    expect(parsed.project).toBe('sample-project');
    expect(parsed.files).toBeGreaterThan(0);
  });

  it('runs centr search', () => {
    runCli(['init']);
    const out = runCli(['search', 'user']);
    expect(out.toLowerCase()).toContain('user');
    expect(out).toContain('File');
  });

  it('runs centr search with --json', () => {
    runCli(['init']);
    const out = runCli(['--json', 'search', 'UserController']);
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].symbol).toBe('UserController');
  });

  it('runs centr symbol lookup', () => {
    runCli(['init']);
    const out = runCli(['symbol', 'UserController']);
    expect(out).toContain('UserController');
    expect(out).toContain('class');
  });

  it('runs centr context generation', () => {
    runCli(['init']);
    const out = runCli(['context', 'Implement password hashing for user login']);
    expect(out).toContain('Context generated');
    expect(out).toContain('Budget:');
    expect(out).toContain('Estimated:');
  });

  it('runs centr context with --json', () => {
    runCli(['init']);
    const out = runCli(['--json', 'context', 'Implement password hashing']);
    const parsed = JSON.parse(out);
    expect(parsed.task).toBe('Implement password hashing');
    expect(parsed.budget).toBeGreaterThan(0);
    expect(Array.isArray(parsed.items)).toBe(true);
  });

  it('runs centr sync after file modification', () => {
    runCli(['init']);
    fs.writeFileSync(path.join(tmpDir, 'src/new-file.ts'), 'export const x = 42;');

    const out = runCli(['sync']);
    expect(out).toContain('Files added:');
    expect(out).toContain('Files unchanged:');
  });

  it('runs centr doctor', () => {
    runCli(['init']);
    const out = runCli(['doctor']);
    expect(out).toContain('Node.js Version');
    expect(out).toContain('Database Integrity');
  });

  it('runs centr benchmark', () => {
    runCli(['init']);
    const out = runCli(['benchmark']);
    expect(out).toContain('Indexing Time:');
    expect(out).toContain('Search Latency:');
    expect(out).toContain('Context Latency:');
  });

  it('runs centr brain subcommands (status, recommend, profile, enable, stats)', () => {
    runCli(['init']);

    // Status
    const statusOut = runCli(['brain', 'status']);
    expect(statusOut).toContain('CentR Brain Status');
    expect(statusOut).toContain('Provider:');

    // Status --json
    const statusJson = runCli(['--json', 'brain', 'status']);
    const parsedStatus = JSON.parse(statusJson);
    expect(parsedStatus.provider).toBeDefined();

    // Recommend
    const recOut = runCli(['brain', 'recommend']);
    expect(recOut).toContain('Recommended Profile:');

    // Recommend --json
    const recJson = runCli(['--json', 'brain', 'recommend']);
    const parsedRec = JSON.parse(recJson);
    expect(parsedRec.recommendedProfile).toBeDefined();

    // Profile switch
    const profOut = runCli(['brain', 'profile', 'balanced']);
    expect(profOut).toContain('Configured Brain profile: balanced');

    // Enable
    const enableOut = runCli(['brain', 'enable']);
    expect(enableOut).toContain('CentR Brain enabled');

    // Set model
    const setModelOut = runCli(['brain', 'set-model', 'qwen2.5:1.5b']);
    expect(setModelOut).toContain('Configured Brain model: qwen2.5:1.5b');

    // Stats
    const statsOut = runCli(['brain', 'stats']);
    expect(statsOut).toContain('Total Calls:');

    // Analyze failure fallback
    const failOut = runCli([
      'brain',
      'analyze-failure',
      '--error',
      'DATABASE_URL is not set',
      '--task',
      'Deploy service',
    ]);
    expect(failOut).toContain('Failure Analysis');

    // Disable
    const disableOut = runCli(['brain', 'disable']);
    expect(disableOut).toContain('CentR Brain disabled');
  });

  it('runs centr benchmark subcommands (agents, record, report, compare)', () => {
    runCli(['init']);

    // Record a manual run
    const recordOut = runCli([
      'benchmark',
      'record',
      '--task',
      'auth-001',
      '--scenario',
      'baseline',
      '--agent',
      'manual-test',
      '--duration',
      '1200',
      '--success',
      '--results-dir',
      path.join(tmpDir, 'bench-results'),
    ]);
    expect(recordOut).toContain('Benchmark run recorded successfully');

    // Report
    const reportOut = runCli([
      'benchmark',
      'report',
      '--results-dir',
      path.join(tmpDir, 'bench-results'),
      '--reports-dir',
      path.join(tmpDir, 'bench-reports'),
    ]);
    expect(reportOut).toContain('CentR A/B Benchmark Summary');
    expect(reportOut).toContain('baseline');

    // Compare
    const compareOut = runCli([
      'benchmark',
      'compare',
      '--results-dir',
      path.join(tmpDir, 'bench-results'),
    ]);
    expect(compareOut).toContain('CentR Scenario Comparison');

    // Agents subcommand (single task and scenario for quick execution)
    const agentsOut = runCli([
      'benchmark',
      'agents',
      '--task',
      'auth-001',
      '--scenario',
      'centr-v1',
      '--results-dir',
      path.join(tmpDir, 'bench-results'),
      '--reports-dir',
      path.join(tmpDir, 'bench-reports'),
    ]);
    expect(agentsOut).toContain('Benchmark completed');
  });
});
