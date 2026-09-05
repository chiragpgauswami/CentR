import { CentrDatabase, ContextEngine, initializeProject } from '@centr/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MockBrainProvider } from '../src/index.js';

describe('Agent A/B Benchmark: V1 Deterministic vs V2 Hybrid', () => {
  let tmpDir: string;
  let db: CentrDatabase;
  let projectId: number;

  it('runs comparative benchmark on sample project tasks', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-ab-benchmark-'));
    const fixturePath = path.resolve('fixtures/sample-project');
    fs.cpSync(fixturePath, tmpDir, { recursive: true });
    const centrDir = path.join(tmpDir, '.centr');
    fs.mkdirSync(centrDir, { recursive: true });

    db = new CentrDatabase(path.join(centrDir, 'centr.db'));
    db.initialize();
    const initRes = await initializeProject(tmpDir, db);
    projectId = initRes.project.id;

    const mockBrain = new MockBrainProvider('normal');
    const engine = new ContextEngine(db);

    const testTasks = [
      'Add JWT authentication middleware to UserController',
      'Optimize database user lookup queries',
      'Fix user profile password validation bug',
    ];

    const results: Array<{
      task: string;
      v1Tokens: number;
      v1Items: number;
      v1TimeMs: number;
      v2Tokens: number;
      v2Items: number;
      v2TimeMs: number;
    }> = [];

    for (const task of testTasks) {
      // V1 Deterministic
      const startV1 = performance.now();
      const v1Result = engine.generate({
        task,
        projectId,
        maxTokens: 3000,
        useBrain: false,
      });
      const v1TimeMs = performance.now() - startV1;

      // V2 Hybrid
      engine.setBrain(mockBrain);
      const startV2 = performance.now();
      const v2Result = await engine.generateWithBrain({
        task,
        projectId,
        maxTokens: 3000,
        useBrain: true,
      });
      const v2TimeMs = performance.now() - startV2;

      // Assertions
      expect(v1Result.estimatedTokens).toBeLessThanOrEqual(3000);
      expect(v2Result.estimatedTokens).toBeLessThanOrEqual(3000);
      expect(v2Result.items.length).toBeGreaterThan(0);

      results.push({
        task,
        v1Tokens: v1Result.estimatedTokens,
        v1Items: v1Result.items.length,
        v1TimeMs,
        v2Tokens: v2Result.estimatedTokens,
        v2Items: v2Result.items.length,
        v2TimeMs,
      });
    }

    // Verify all tasks were benchmarked
    expect(results).toHaveLength(3);
    for (const res of results) {
      expect(res.v2Items).toBeGreaterThan(0);
    }

    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
