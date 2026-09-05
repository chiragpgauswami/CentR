import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ContextEngine } from '../src/context/index.js';
import { estimateTokens, fitToBudget } from '../src/context/tokens.js';
import { initializeProject } from '../src/indexer/index.js';
import { LearningService } from '../src/learning/index.js';
import { ProjectMemoryService } from '../src/memory/index.js';
import { CentrDatabase } from '../src/storage/database.js';

describe('Context Engine & Token Budgeting', () => {
  describe('estimateTokens', () => {
    it('estimates ~4 characters per token', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('abcd')).toBe(1);
      expect(estimateTokens('abcdefgh')).toBe(2);
      expect(estimateTokens('a'.repeat(400))).toBe(100);
    });
  });

  describe('fitToBudget', () => {
    it('selects items within budget sorted by relevance', () => {
      const items = [
        {
          name: 'low',
          content: 'a'.repeat(400),
          relevance: 0.2,
          type: 'file' as const,
          tokens: 100,
          source: 'low.ts',
        },
        {
          name: 'high',
          content: 'b'.repeat(400),
          relevance: 0.9,
          type: 'file' as const,
          tokens: 100,
          source: 'high.ts',
        },
        {
          name: 'med',
          content: 'c'.repeat(400),
          relevance: 0.6,
          type: 'file' as const,
          tokens: 100,
          source: 'med.ts',
        },
      ];

      // Budget for 2 items (200 tokens)
      const res = fitToBudget(items, 200);

      expect(res.selected).toHaveLength(2);
      expect(res.selected[0].name).toBe('high');
      expect(res.selected[1].name).toBe('med');
      expect(res.removed).toHaveLength(1);
      expect(res.removed[0].name).toBe('low');
      expect(res.estimatedTokens).toBeLessThanOrEqual(200);
    });

    it('handles empty items array', () => {
      const res = fitToBudget([], 1000);
      expect(res.selected).toHaveLength(0);
      expect(res.removed).toHaveLength(0);
      expect(res.estimatedTokens).toBe(0);
    });
  });

  describe('ContextEngine.generate', () => {
    let tmpDir: string;
    let db: CentrDatabase;
    let projectId: number;

    beforeEach(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-ctx-'));
      db = new CentrDatabase(path.join(tmpDir, 'test.db'));
      db.initialize();

      const fixturePath = path.resolve('fixtures/sample-project');
      const initRes = await initializeProject(fixturePath, db);
      projectId = initRes.project.id;

      // Add a relevant memory
      const mem = new ProjectMemoryService(db);
      mem.create({
        projectId,
        title: 'Auth Architecture',
        content: 'JWT based authentication using AuthService',
        category: 'architecture',
        source: 'docs/auth.md',
      });

      // Add a relevant learning
      const learn = new LearningService(db);
      learn.record({
        lesson: 'Always validate tokens with expiration check',
        category: 'security',
        trigger: 'auth login',
        recommendedAction: 'Verify exp timestamp',
        scope: 'global',
        sourceExperience: 'Auth debugging',
      });
    });

    afterEach(() => {
      db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('generates focused context within maxTokens budget', () => {
      const engine = new ContextEngine(db);
      const result = engine.generate({
        task: 'Add Google OAuth to user authentication',
        projectId,
        maxTokens: 2000,
      });

      expect(result).toBeDefined();
      expect(result.estimatedTokens).toBeLessThanOrEqual(2000);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.budget).toBe(2000);
      expect(result.itemsSelected).toBe(result.items.length);

      // Context should contain auth-related items
      const itemNames = result.items.map((i) => i.name.toLowerCase());
      const hasAuth = itemNames.some((n) => n.includes('auth') || n.includes('user'));
      expect(hasAuth).toBe(true);
    });

    it('respects exclusion flags', () => {
      const engine = new ContextEngine(db);
      const result = engine.generate({
        task: 'Add Google OAuth',
        projectId,
        includeMemory: false,
        includeLearning: false,
        includeSkills: false,
      });

      const types = new Set(result.items.map((i) => i.type));
      expect(types.has('memory')).toBe(false);
      expect(types.has('learning')).toBe(false);
      expect(types.has('skill')).toBe(false);
    });

    it('populates explainable reason for all selected items', () => {
      const engine = new ContextEngine(db);
      const result = engine.generate({
        task: 'auth login',
        projectId,
        maxTokens: 4000,
      });

      expect(result.items.length).toBeGreaterThan(0);
      for (const item of result.items) {
        expect(item.reason).toBeDefined();
        expect(typeof item.reason).toBe('string');
        expect(item.reason!.length).toBeGreaterThan(5);
      }
    });

    it('enforces stricter eviction under tight budget (1000 vs 4000 tokens)', () => {
      const engine = new ContextEngine(db);
      const tight = engine.generate({
        task: 'auth user database service controller',
        projectId,
        maxTokens: 500,
      });
      const relaxed = engine.generate({
        task: 'auth user database service controller',
        projectId,
        maxTokens: 4000,
      });

      expect(tight.estimatedTokens).toBeLessThanOrEqual(500);
      expect(relaxed.estimatedTokens).toBeLessThanOrEqual(4000);
      expect(relaxed.itemsSelected).toBeGreaterThanOrEqual(tight.itemsSelected);
    });
  });
});
