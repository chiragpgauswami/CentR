import {
  CentrDatabase,
  ContextEngine,
  LearningService,
  SkillsService,
  initializeProject,
  loadConfig,
  saveConfig,
} from '@centr-ai/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BrainCache,
  BrainInvalidResponseError,
  BrainManager,
  BrainMetricsCollector,
  BrainTimeoutError,
  BrainUnavailableError,
  MockBrainProvider,
  OllamaProvider,
  detectHardware,
  extractJsonFromText,
  recommendProfile,
  validateContextRanking,
  validateFailureAnalysis,
  validateLearningExtraction,
  validateSkillSelection,
  validateSummarization,
  validateTaskClassification,
} from '../src/index.js';

describe('CentR V2 Brain Comprehensive Test Suite', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Hardware Detection & Profile Recommendation', () => {
    it('detects system hardware properties accurately', () => {
      const hw = detectHardware();
      expect(hw.os).toBeDefined();
      expect(hw.arch).toBeDefined();
      expect(hw.totalMemoryGb).toBeGreaterThan(0);
      expect(hw.cpuCores).toBeGreaterThan(0);
      expect(typeof hw.isAppleSilicon).toBe('boolean');
      expect(typeof hw.hasGpu).toBe('boolean');
    });

    it('recommends minimal profile for low-end hardware (< 6GB)', () => {
      const rec = recommendProfile({
        os: 'linux',
        arch: 'x64',
        totalMemoryGb: 4,
        cpuCores: 2,
        isAppleSilicon: false,
        hasGpu: false,
      });
      expect(rec.recommendedProfile).toBe('minimal');
      expect(rec.recommendedModels).toContain('qwen2.5:1.5b');
    });

    it('recommends balanced profile for mid-tier hardware (8-12GB)', () => {
      const rec = recommendProfile({
        os: 'linux',
        arch: 'x64',
        totalMemoryGb: 8,
        cpuCores: 4,
        isAppleSilicon: false,
        hasGpu: false,
      });
      expect(rec.recommendedProfile).toBe('balanced');
      expect(rec.recommendedModels).toContain('llama3.2:3b');
    });

    it('recommends quality profile for high-end hardware (16GB+)', () => {
      const rec = recommendProfile({
        os: 'darwin',
        arch: 'arm64',
        totalMemoryGb: 32,
        cpuCores: 10,
        isAppleSilicon: true,
        hasGpu: true,
      });
      expect(rec.recommendedProfile).toBe('quality');
      expect(rec.recommendedModels).toContain('qwen2.5:7b');
    });
  });

  describe('2. Validation & Strict Hallucination Guards', () => {
    it('extracts valid JSON from raw text, markdown blocks, and surrounding prose', () => {
      const raw =
        'Here is the response: ```json\n{"category": "bugfix", "confidence": 0.9}\n``` Hope this helps!';
      const extracted = extractJsonFromText(raw);
      expect(extracted).toEqual({ category: 'bugfix', confidence: 0.9 });
    });

    it('throws BrainInvalidResponseError on unparseable garbage', () => {
      expect(() => extractJsonFromText('No json here at all.')).toThrow(BrainInvalidResponseError);
    });

    it('validates task classification schema and defaults missing fields', () => {
      const valid = validateTaskClassification({
        category: 'feature',
        risk: 'medium',
        confidence: 0.8,
        subcategories: ['auth'],
      });
      expect(valid.category).toBe('feature');
      expect(valid.risk).toBe('medium');
      expect(valid.suggestedDomains).toEqual([]);
    });

    it('strictly guards against hallucinated context IDs', () => {
      const allowedIds = new Set(['item-1', 'item-2']);
      const rankings = validateContextRanking(
        {
          items: [
            { id: 'item-1', score: 0.95, reason: 'Exact match' },
            { id: 'fake-hallucinated-file.ts', score: 0.99, reason: 'Invented by LLM' },
            { id: 'item-2', score: 0.8, reason: 'Relevant symbol' },
          ],
        },
        allowedIds,
      );

      // Must filter out 'fake-hallucinated-file.ts' completely
      expect(rankings.items.map((r) => r.id)).toEqual(['item-1', 'item-2']);
    });

    it('strictly guards against hallucinated skill IDs', () => {
      const allowedSkills = new Set(['skill:auth', 'skill:sqlite']);
      const selected = validateSkillSelection(
        {
          selectedSkillIds: ['skill:auth', 'skill:invented-nonexistent'],
          reasoning: { 'skill:auth': 'valid', 'skill:invented-nonexistent': 'hallucinated' },
        },
        allowedSkills,
      );

      expect(selected.selectedSkillIds).toEqual(['skill:auth']);
      expect(selected.reasoning['skill:invented-nonexistent']).toBeUndefined();
    });

    it('validates learning extraction schema', () => {
      const learning = validateLearningExtraction({
        lesson: 'Always close DB statements in finally block',
        category: 'database',
        trigger: 'sqlite locked',
        recommendedAction: 'Add finally block',
        confidence: 0.9,
      });
      expect(learning.lesson).toBe('Always close DB statements in finally block');
      expect(learning.generalizable).toBe(true);
    });

    it('validates failure analysis schema and normalizes failureType', () => {
      const analysis = validateFailureAnalysis({
        failureType: 'configuration',
        rootCause: 'Missing env var API_KEY',
        fixRecommendation: 'Define API_KEY in .env',
        confidence: 0.85,
      });
      expect(analysis.failureType).toBe('configuration');
      expect(analysis.rootCause).toContain('API_KEY');
    });

    it('validates summarization schema', () => {
      const summary = validateSummarization({
        summary: 'Module exports authentication helpers',
        sourceIds: ['auth.ts'],
        keyPoints: ['signToken', 'verifyToken'],
      });
      expect(summary.summary).toContain('authentication');
      expect(summary.sourceIds).toContain('auth.ts');
    });
  });

  describe('3. Cache Management (TTL, LRU, Hashing)', () => {
    it('caches and retrieves results deterministically', () => {
      const cache = new BrainCache(10, 5000);
      const output = {
        category: 'feature',
        subcategories: [],
        entities: [],
        risk: 'low' as const,
        confidence: 1,
        suggestedDomains: [],
      };
      const key = cache.computeKey('classifyTask', 'qwen2.5:1.5b', 'Add login route');

      cache.set(key, output);
      const cached = cache.get(key);
      expect(cached).toEqual(output);

      // Miss on different key
      const otherKey = cache.computeKey('classifyTask', 'qwen2.5:1.5b', 'Different prompt');
      expect(cache.get(otherKey)).toBeUndefined();
    });

    it('evicts entries when maxEntries is exceeded', () => {
      const cache = new BrainCache(2, 5000);
      const k1 = cache.computeKey('op', 'm', 'p1');
      const k2 = cache.computeKey('op', 'm', 'p2');
      const k3 = cache.computeKey('op', 'm', 'p3');

      cache.set(k1, 1);
      cache.set(k2, 2);
      expect(cache.size()).toBe(2);

      // Adding 3rd should evict oldest
      cache.set(k3, 3);
      expect(cache.size()).toBe(2);
      expect(cache.get(k1)).toBeUndefined();
      expect(cache.get(k3)).toBe(3);
    });

    it('expires stale entries beyond TTL', async () => {
      const cache = new BrainCache(10, 20); // 20ms TTL
      const key = cache.computeKey('op', 'm', 'key1');
      cache.set(key, 'val1');
      expect(cache.get(key)).toBe('val1');

      await new Promise((r) => setTimeout(r, 40));
      expect(cache.get(key)).toBeUndefined();
    });
  });

  describe('4. Metrics & Telemetry Tracking', () => {
    it('records latency, tokens, fallbacks, and cache hits', () => {
      const metrics = new BrainMetricsCollector();
      metrics.recordCall(50);
      metrics.recordCall(80);
      metrics.recordSuccess(120, 20);
      metrics.recordSuccess(180, 40);
      metrics.recordFallback();
      metrics.recordCacheHit();
      metrics.recordCacheMiss();

      const snapshot = metrics.getSnapshot();
      expect(snapshot.totalCalls).toBe(2);
      expect(snapshot.estimatedInputTokens).toBe(130);
      expect(snapshot.estimatedOutputTokens).toBe(60);
      expect(snapshot.fallbackCount).toBe(1);
      expect(snapshot.cacheHits).toBe(1);
      expect(snapshot.cacheMisses).toBe(1);
      expect(snapshot.averageLatencyMs).toBe(150);
    });
  });

  describe('5. MockBrainProvider Configurable Behaviors', () => {
    it('handles normal behavior across all 6 core tasks', async () => {
      const provider = new MockBrainProvider('normal');
      expect(provider.name).toBe('mock');
      expect(await provider.isReady()).toBe(true);

      const classification = await provider.classifyTask({ task: 'Add Google login' });
      expect(classification.category).toBe('authentication');

      const ranking = await provider.rankContext({
        task: 'Add Google login',
        candidates: [
          {
            id: 'file:auth.ts',
            type: 'file',
            name: 'auth.ts',
            content: 'login logic',
            deterministicScore: 0.8,
          },
        ],
      });
      expect(ranking.items).toHaveLength(1);

      const learning = await provider.extractLearning({
        task: 'Fix port conflict',
        attemptedChange: 'Change port to 3001',
        result: 'success',
      });
      expect(learning.lesson).toBeDefined();

      const failure = await provider.analyzeFailure({
        task: 'Deploy service',
        attemptedChange: 'Start container',
        error: 'Missing env DATABASE_URL',
      });
      expect(failure.failureType).toBe('configuration');

      const skills = await provider.selectSkills({
        task: 'Tune sqlite performance',
        candidateSkills: [{ id: 's1', name: 'Tune sqlite performance', description: 'desc' }],
      });
      expect(skills.selectedSkillIds).toContain('s1');

      const summary = await provider.summarize({
        sourceId: 'file:test.ts',
        content: 'line 1\nline 2',
      });
      expect(summary.summary).toBeDefined();
    });

    it('simulates timeout error when behavior is set to timeout', async () => {
      const provider = new MockBrainProvider('timeout', 5);
      await expect(provider.classifyTask({ task: 'test' })).rejects.toThrow(BrainTimeoutError);
    });

    it('simulates invalid JSON when behavior is set to invalid_json', async () => {
      const provider = new MockBrainProvider('invalid_json');
      await expect(provider.classifyTask({ task: 'test' })).rejects.toThrow(
        BrainInvalidResponseError,
      );
    });

    it('simulates offline error when behavior is set to offline', async () => {
      const provider = new MockBrainProvider('offline');
      await expect(provider.classifyTask({ task: 'test' })).rejects.toThrow(BrainUnavailableError);
    });

    it('simulates hallucinated IDs when behavior is set to hallucinate', async () => {
      const provider = new MockBrainProvider('hallucinate');
      const ranking = await provider.rankContext({
        task: 'test',
        candidates: [
          { id: 'real-1', type: 'file', name: 'real.ts', content: '', deterministicScore: 0.5 },
        ],
      });
      expect(ranking.items.some((r) => r.id === 'file:src/hallucinated/fake-file.ts')).toBe(true);
    });
  });

  describe('6. OllamaProvider with Mock HTTP Fetch', () => {
    it('communicates with local Ollama endpoint and parses JSON responses', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: RequestInfo | URL) => {
        const url = String(info);
        if (url.endsWith('/api/tags')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              models: [{ name: 'llama3.2:3b' }, { name: 'qwen2.5:1.5b' }],
            }),
          } as unknown as Response;
        }
        if (url.endsWith('/api/generate')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              response: JSON.stringify({
                category: 'feature',
                subcategories: ['auth'],
                entities: ['JWT'],
                risk: 'low',
                confidence: 0.95,
                suggestedDomains: ['api'],
              }),
              prompt_eval_count: 35,
              eval_count: 22,
            }),
          } as unknown as Response;
        }
        return { ok: false, status: 404 } as unknown as Response;
      });

      const provider = new OllamaProvider({
        model: 'llama3.2:3b',
      });

      expect(await provider.isReady()).toBe(true);
      const models = await provider.listModels();
      expect(models).toContain('llama3.2:3b');

      const classification = await provider.classifyTask({ task: 'Add JWT auth' });
      expect(classification.category).toBe('feature');
      expect(classification.confidence).toBe(0.95);
    });

    it('throws BrainUnavailableError on connection failure (offline)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:11434'));
      const provider = new OllamaProvider({});

      expect(await provider.isReady()).toBe(false);
      await expect(provider.classifyTask({ task: 'test' })).rejects.toThrow(BrainUnavailableError);
    });

    it('throws BrainTimeoutError on request timeout', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        const err = new Error('The operation was aborted');
        err.name = 'TimeoutError';
        throw err;
      });
      const provider = new OllamaProvider({
        timeoutMs: 100,
      });

      await expect(provider.classifyTask({ task: 'test' })).rejects.toThrow(BrainTimeoutError);
    });
  });

  describe('7. End-to-End 21-Step Lifecycle Test (Section 36)', () => {
    let tmpDir: string;
    let db: CentrDatabase;

    it('executes full 21-step lifecycle without errors or regressions', async () => {
      // Step 1: Detect hardware and select recommended profile
      const hw = detectHardware();
      expect(hw.totalMemoryGb).toBeGreaterThan(0);
      const rec = recommendProfile(hw);
      expect(['minimal', 'balanced', 'quality']).toContain(rec.recommendedProfile);

      // Step 2: Set up temporary project workspace and CentrDatabase
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-brain-lifecycle-'));
      const fixturePath = path.resolve('fixtures/sample-project');
      fs.cpSync(fixturePath, tmpDir, { recursive: true });
      const centrDir = path.join(tmpDir, '.centr');
      fs.mkdirSync(centrDir, { recursive: true });

      db = new CentrDatabase(path.join(centrDir, 'centr.db'));
      db.initialize();
      const initResult = await initializeProject(tmpDir, db);
      expect(initResult.filesIndexed).toBeGreaterThan(0);

      // Step 3: Instantiate BrainManager with MockBrainProvider
      const mockBrain = new MockBrainProvider('normal');
      const brainManager = new BrainManager(mockBrain);
      expect(await brainManager.isAvailable()).toBe(true);

      // Step 4: Classify task with Brain
      const task = 'Implement secure user password reset flow with token expiration';
      const classification = await brainManager.classifyTask({ task });
      expect(classification.category).toBe('feature');

      // Step 5: Core generates candidate items
      const contextEngine = new ContextEngine(db);
      const candidates = [
        {
          id: 'file:src/controllers/UserController.ts',
          type: 'file' as const,
          name: 'src/controllers/UserController.ts',
          content: 'export class UserController { resetPassword() {} }',
          deterministicScore: 0.85,
        },
        {
          id: 'file:src/models/User.ts',
          type: 'file' as const,
          name: 'src/models/User.ts',
          content: 'export interface User { resetToken?: string; }',
          deterministicScore: 0.8,
        },
      ];

      // Step 6: Brain ranks candidates
      const rankedOutput = await brainManager.rankContext({ task, candidates });
      expect(rankedOutput.items.length).toBeGreaterThan(0);

      // Step 7: Hallucination guard validates rankings
      const allowedIds = new Set(candidates.map((c) => c.id));
      const guardedRankings = validateContextRanking(rankedOutput, allowedIds);
      expect(guardedRankings.items.every((r) => allowedIds.has(r.id))).toBe(true);

      // Step 8: ContextEngine performs hybrid ranking (0.5 * det + 0.5 * brain)
      contextEngine.setBrain(mockBrain);
      const hybridContext = await contextEngine.generateWithBrain({
        task,
        projectId: initResult.project.id,
        maxTokens: 4000,
        useBrain: true,
      });
      expect(hybridContext.items.length).toBeGreaterThan(0);
      expect(hybridContext.estimatedTokens).toBeLessThanOrEqual(4000);

      // Step 9: Verify caching on repeated request
      const cacheBefore = brainManager.getMetrics().getSnapshot().cacheHits;
      await brainManager.classifyTask({ task }); // repeated classification with same prompt
      const cacheAfter = brainManager.getMetrics().getSnapshot().cacheHits;
      expect(cacheAfter).toBeGreaterThanOrEqual(cacheBefore + 1);

      // Step 10: Simulate error and analyze failure with Brain
      const failureAnalysis = await brainManager.analyzeFailure({
        task: 'Connect to database',
        attemptedChange: 'Updated port to 5432',
        error: 'ECONNREFUSED 127.0.0.1:5432 - environment configuration missing',
      });
      expect(failureAnalysis.failureType).toBe('configuration');

      // Step 11: Extract learning from successful fix
      const learningService = new LearningService(db);
      const extractedLearning = await brainManager.extractLearning({
        task: 'Fix database connection error',
        attemptedChange: 'Loaded environment variables before DB client initialization',
        result: 'success',
      });
      expect(extractedLearning.lesson).toBeDefined();

      // Step 12: Record extracted learning in DB
      const recordedLearning = learningService.record({
        lesson: extractedLearning.lesson,
        category: extractedLearning.category,
        trigger: extractedLearning.trigger,
        recommendedAction: extractedLearning.recommendedAction,
        scope: 'global',
        sourceExperience: 'Database configuration fix',
        confidence: extractedLearning.confidence,
      });
      expect(recordedLearning.status).toBe('candidate');

      // Step 13: Add evidence to learning
      learningService.addEvidence(recordedLearning.id, {
        experience: 'Applied to test environment with success',
        outcome: 'success',
        context: 'CI/CD pipeline test run',
      });

      // Step 14: Promote learning to validated
      const promoted = learningService.promote(recordedLearning.id);
      expect(promoted?.status).toBe('validated');

      // Step 15: Select skills for task
      const skillsService = new SkillsService(db);
      skillsService.record({
        name: 'Authentication Debugging',
        description: 'Verify token expiration and header formats',
        trigger: 'auth failure',
        instructions: 'Check token exp claim and bearer scheme',
        category: 'security',
        source: 'manual',
      });
      const skillSelection = await brainManager.selectSkills({
        task: 'Debug JWT authentication failure',
        candidateSkills: [
          {
            id: 'skill:1',
            name: 'Authentication Debugging',
            description: 'Verify token expiration and header formats',
          },
        ],
      });
      expect(skillSelection.selectedSkillIds).toContain('skill:1');

      // Step 16: Summarize module
      const summarization = await brainManager.summarize({
        sourceId: 'src/controllers/UserController.ts',
        content: 'export class UserController { login() {} logout() {} }',
      });
      expect(summarization.summary).toBeDefined();

      // Step 17: Simulate provider timeout -> fallback to deterministic
      const timeoutBrain = new MockBrainProvider('timeout', 5);
      const timeoutManager = new BrainManager(timeoutBrain);
      const fallbackClassification = await timeoutManager.classifyTask({ task: 'Add user login' });
      expect(fallbackClassification.category).toBe('feature'); // deterministic fallback succeeded
      expect(timeoutManager.getMetrics().getSnapshot().fallbackCount).toBe(1);

      // Step 18: Simulate provider invalid JSON -> fallback to deterministic
      const invalidJsonBrain = new MockBrainProvider('invalid_json');
      const invalidManager = new BrainManager(invalidJsonBrain);
      const fallbackRanking = await invalidManager.rankContext({
        task: 'user login',
        candidates: [
          { id: '1', type: 'file', name: 'user.ts', content: 'login', deterministicScore: 0.5 },
        ],
      });
      expect(fallbackRanking.items).toHaveLength(1);
      expect(invalidManager.getMetrics().getSnapshot().fallbackCount).toBe(1);

      // Step 19: Simulate provider offline -> fallback to deterministic
      const offlineBrain = new MockBrainProvider('offline');
      const offlineManager = new BrainManager(offlineBrain);
      const fallbackSkills = await offlineManager.selectSkills({
        task: 'user login',
        candidateSkills: [{ id: 's1', name: 'user login', description: 'handle login' }],
      });
      expect(fallbackSkills.selectedSkillIds).toContain('s1');
      expect(offlineManager.getMetrics().getSnapshot().fallbackCount).toBe(1);

      // Step 20: Persist Brain config in project settings
      const cfg = loadConfig(tmpDir);
      cfg.brain = {
        enabled: true,
        provider: 'mock',
        model: 'mock-model',
        profile: rec.recommendedProfile,
      };
      saveConfig(tmpDir, cfg);
      const reloadedCfg = loadConfig(tmpDir);
      expect(reloadedCfg.brain.enabled).toBe(true);
      expect(reloadedCfg.brain.provider).toBe('mock');

      // Step 21: Verify metrics and clean shutdown
      const metricsSummary = brainManager.getMetrics().getSnapshot();
      expect(metricsSummary.totalCalls).toBeGreaterThan(0);
      expect(metricsSummary.estimatedInputTokens).toBeGreaterThan(0);
      db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
