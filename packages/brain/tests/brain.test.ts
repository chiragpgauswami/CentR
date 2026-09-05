import { describe, expect, it } from 'vitest';
import {
  BrainManager,
  DeterministicContextRanker,
  DeterministicTaskClassifier,
} from '../src/index.js';

describe('Brain Module', () => {
  describe('DeterministicTaskClassifier', () => {
    const classifier = new DeterministicTaskClassifier();

    it('classifies feature implementation tasks', async () => {
      const res = await classifier.classify('Add Google OAuth authentication flow');
      expect(res.type).toBe('feature');
      expect(res.domains).toContain('authentication');
      expect(res.confidence).toBeGreaterThan(0);
    });

    it('classifies bugfix tasks', async () => {
      const res = await classifier.classify(
        'Fix crash when user session expires and throws null pointer error',
      );
      expect(res.type).toBe('bugfix');
    });

    it('classifies refactoring tasks', async () => {
      const res = await classifier.classify(
        'Refactor database query logic to clean up duplicate code',
      );
      expect(res.type).toBe('refactor');
      expect(res.domains).toContain('database');
    });

    it('classifies test tasks', async () => {
      const res = await classifier.classify(
        'Add unit tests for validation utility and improve coverage',
      );
      expect(res.type).toBe('test');
      expect(res.domains).toContain('testing');
    });

    it('classifies security tasks', async () => {
      const res = await classifier.classify('Audit auth token permissions and secure secret keys');
      expect(res.type).toBe('security');
      expect(res.domains).toContain('authentication');
    });

    it('extracts non-stop-word keywords', async () => {
      const res = await classifier.classify('Add Redis caching to user profile API endpoint');
      expect(res.keywords).toContain('redis');
      expect(res.keywords).toContain('caching');
      expect(res.keywords).toContain('user');
      expect(res.keywords).toContain('profile');
      expect(res.keywords).toContain('endpoint');
    });
  });

  describe('DeterministicContextRanker', () => {
    const ranker = new DeterministicContextRanker();

    it('ranks relevant items higher based on keywords', async () => {
      const task = 'Implement user authentication with password hash';
      const items = [
        { content: 'export function sendEmail() {}', metadata: { type: 'symbol' } },
        { content: 'export class AuthService { hashPassword() {} }', metadata: { type: 'symbol' } },
        {
          content: 'User authentication guide: use argon2 for password hash',
          metadata: { type: 'memory' },
        },
      ];

      const ranked = await ranker.rank(task, items);
      expect(ranked).toHaveLength(3);

      // Item 1 and Item 2 should have higher score than Item 0
      const score0 = ranked.find((r) => r.index === 0)?.score ?? 0;
      const score1 = ranked.find((r) => r.index === 1)?.score ?? 0;
      const score2 = ranked.find((r) => r.index === 2)?.score ?? 0;

      expect(score1).toBeGreaterThan(score0);
      expect(score2).toBeGreaterThan(score0);
    });
  });

  describe('NullBrainProvider & BrainManager', () => {
    it('manages provider and reports availability', async () => {
      const manager = new BrainManager();
      expect(await manager.isAvailable()).toBe(false);
      expect(manager.getProvider().name).toBe('none');

      const isReady = await manager.getProvider().isReady();
      expect(isReady).toBe(false);

      const completion = await manager.getProvider().complete('test');
      expect(completion).toBe('');

      expect(manager.getClassifier()).toBeDefined();
      expect(manager.getRanker()).toBeDefined();
    });
  });
});
