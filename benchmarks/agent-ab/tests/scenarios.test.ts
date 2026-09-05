import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createIsolatedWorkspace } from '../src/runner/isolation.js';
import {
  BaselineScenario,
  CentRV1Scenario,
  CentRV2Scenario,
  getScenarioPreparer,
} from '../src/scenarios/index.js';

describe('Scenario Preparers', () => {
  const fixturePath = path.resolve('fixtures/sample-project');

  it('creates correct ScenarioPreparer instances from factory', () => {
    expect(getScenarioPreparer('baseline')).toBeInstanceOf(BaselineScenario);
    expect(getScenarioPreparer('centr-v1')).toBeInstanceOf(CentRV1Scenario);
    expect(getScenarioPreparer('centr-v2')).toBeInstanceOf(CentRV2Scenario);
    expect(() => getScenarioPreparer('unknown' as any)).toThrow();
  });

  it('prepares Baseline scenario with CentR disabled', async () => {
    const { workspaceDir, cleanup } = createIsolatedWorkspace(fixturePath);

    try {
      const preparer = new BaselineScenario();
      const ctx = await preparer.prepare(workspaceDir, 'fix auth token expiration');

      expect(ctx.type).toBe('baseline');
      expect(ctx.centrEnabled).toBe(false);
      expect(ctx.brainEnabled).toBe(false);
      expect(ctx.contextResult).toBeUndefined();
      expect(ctx.centrLatencyMs).toBeUndefined();
      expect(ctx.centrTokens).toBeUndefined();
    } finally {
      cleanup();
    }
  });

  it('prepares CentR V1 scenario with deterministic indexer and context engine', async () => {
    const { workspaceDir, cleanup } = createIsolatedWorkspace(fixturePath);

    try {
      const preparer = new CentRV1Scenario();
      const ctx = await preparer.prepare(workspaceDir, 'fix auth token expiration');

      expect(ctx.type).toBe('centr-v1');
      expect(ctx.centrEnabled).toBe(true);
      expect(ctx.brainEnabled).toBe(false);
      expect(ctx.contextResult).not.toBeNull();
      expect(ctx.contextResult?.items.length).toBeGreaterThan(0);
      expect(typeof ctx.centrLatencyMs).toBe('number');
      expect(typeof ctx.centrTokens).toBe('number');
    } finally {
      cleanup();
    }
  });

  it('prepares CentR V2 scenario with hybrid Brain context and metrics', async () => {
    const { workspaceDir, cleanup } = createIsolatedWorkspace(fixturePath);

    try {
      const preparer = new CentRV2Scenario();
      const ctx = await preparer.prepare(workspaceDir, 'fix auth token expiration', {
        brainProvider: 'mock',
      });

      expect(ctx.type).toBe('centr-v2');
      expect(ctx.centrEnabled).toBe(true);
      expect(ctx.brainEnabled).toBe(true);
      expect(ctx.contextResult).not.toBeNull();
      expect(ctx.contextResult?.items.length).toBeGreaterThan(0);
      expect(typeof ctx.centrLatencyMs).toBe('number');
      expect(ctx.brainMetrics).toBeDefined();
    } finally {
      cleanup();
    }
  });
});
