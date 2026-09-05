import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LearningService } from '../src/learning/index.js';
import { CentrDatabase } from '../src/storage/database.js';

describe('Global Learning Service', () => {
  let tmpDir: string;
  let db: CentrDatabase;
  let learningService: LearningService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-learn-'));
    db = new CentrDatabase(path.join(tmpDir, 'test.db'));
    db.initialize();
    learningService = new LearningService(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('records a new candidate lesson with initial confidence', () => {
    const lesson = learningService.record({
      lesson: 'When modifying auth middleware, verify required environment configuration',
      category: 'debugging',
      trigger: 'auth middleware modification or test failure',
      recommendedAction: 'Check JWT_SECRET and env loading before running server',
      scope: 'global',
      sourceExperience: 'Task: Fix authentication, middleware change failed due to missing env',
      confidence: 0.5,
    });

    expect(lesson).toBeDefined();
    expect(lesson.id).toBeGreaterThan(0);
    expect(lesson.status).toBe('candidate');
    expect(lesson.confidence).toBe(0.5);
  });

  it('recalculates confidence when evidence is added', () => {
    const lesson = learningService.record({
      lesson: 'Always build packages before running integration tests',
      category: 'workflow',
      trigger: 'integration test failure',
      recommendedAction: 'Run npm run build first',
      scope: 'global',
      sourceExperience: 'Initial build experience',
    });

    // Add successful evidence -> confidence increases
    learningService.addEvidence(lesson.id, {
      experience: 'Ran build before tests',
      outcome: 'success',
      context: 'CI pipeline run #101',
    });

    let updated = learningService.getById(lesson.id);
    expect(updated?.confidence).toBe(1.0); // 1 success / 1 total

    // Add failure evidence -> confidence drops
    learningService.addEvidence(lesson.id, {
      experience: 'Build succeeded but test still failed due to network',
      outcome: 'failure',
      context: 'CI pipeline run #102',
    });

    updated = learningService.getById(lesson.id);
    expect(updated?.confidence).toBe(0.5); // 1 success / 2 total

    // Add more success evidence
    learningService.addEvidence(lesson.id, {
      experience: 'Build succeeded and tests passed',
      outcome: 'success',
      context: 'Local test run',
    });

    updated = learningService.getById(lesson.id);
    expect(updated?.confidence).toBeCloseTo(2 / 3, 2);
  });

  it('promotes candidate to validated only when confidence meets threshold', () => {
    const lesson = learningService.record({
      lesson: 'Parameterized SQL prevents injection',
      category: 'security',
      trigger: 'database query implementation',
      recommendedAction: 'Use placeholders instead of string interpolation',
      scope: 'global',
      sourceExperience: 'Security audit',
      confidence: 0.5,
    });

    // Confidence 0.5 is below default promotion threshold (0.7)
    const promoteAttempt = learningService.promote(lesson.id);
    expect(promoteAttempt).toBeNull();

    // Set confidence to 0.85
    learningService.updateConfidence(lesson.id, 0.85);

    const promoted = learningService.promote(lesson.id);
    expect(promoted).toBeDefined();
    expect(promoted?.status).toBe('validated');
  });

  it('rejects candidate lessons', () => {
    const lesson = learningService.record({
      lesson: 'Flaky pattern that did not work',
      category: 'workflow',
      trigger: 'test',
      recommendedAction: 'none',
      scope: 'global',
      sourceExperience: 'trial',
    });

    const rejected = learningService.reject(lesson.id);
    expect(rejected).toBeDefined();
    expect(rejected?.status).toBe('rejected');
  });

  it('searches learning using FTS', () => {
    learningService.record({
      lesson: 'Use Vitest for fast ESM testing',
      category: 'testing',
      trigger: 'test runner selection',
      recommendedAction: 'Configure vitest.config.ts',
      scope: 'global',
      sourceExperience: 'Setup experience',
    });

    const results = learningService.search('Vitest');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].lesson).toContain('Vitest');
  });

  it('prevents recording duplicate lessons with identical lesson and trigger', () => {
    const l1 = learningService.record({
      lesson: 'Never commit .env files',
      category: 'security',
      trigger: 'git commit env',
      recommendedAction: 'Add .env to .gitignore',
      scope: 'global',
      sourceExperience: 'exp1',
    });

    const l2 = learningService.record({
      lesson: 'Never commit .env files',
      category: 'security',
      trigger: 'git commit env',
      recommendedAction: 'Add .env to .gitignore',
      scope: 'global',
      sourceExperience: 'exp2',
    });

    expect(l1.id).toBe(l2.id);
  });

  it('handles contradictory evidence with confidence floor of 0.1', () => {
    const lesson = learningService.record({
      lesson: 'Use async/await instead of callbacks',
      category: 'patterns',
      trigger: 'async code',
      recommendedAction: 'use async/await',
      scope: 'global',
      sourceExperience: 'refactor',
    });

    // Add 10 failures
    for (let i = 0; i < 10; i++) {
      learningService.addEvidence(lesson.id, {
        experience: `Failure attempt ${i}`,
        outcome: 'failure',
        context: 'test run',
      });
    }

    const updated = learningService.getById(lesson.id);
    expect(updated?.confidence).toBe(0.1); // Floor is 0.1
  });

  it('simulates the full 8-step agent learning lifecycle and context injection', async () => {
    const { ContextEngine } = await import('../src/context/index.js');
    const { initializeProject } = await import('../src/indexer/index.js');

    // 1. Initialize project
    const fixturePath = path.resolve('fixtures/sample-project');
    const initRes = await initializeProject(fixturePath, db);
    const projectId = initRes.project.id;

    // 2. Initial task: "Configure Redis cache connection"
    const engine = new ContextEngine(db);
    const initialContext = engine.generate({ task: 'Configure Redis cache', projectId });
    expect(initialContext.items.some((i) => i.name.includes('Redis'))).toBe(false);

    // 3. Agent attempts task, encounters error: "ECONNRESET in clustered mode"
    // 4. Agent discovers fix: "Enable TLS SNI for clustered Redis"
    // 5. Agent validates fix with passing tests
    // 6. Agent records candidate lesson
    const lesson = learningService.record({
      lesson: 'Clustered Redis requires TLS SNI configuration to prevent connection drops',
      category: 'infrastructure',
      trigger: 'Redis cache connection clustered',
      recommendedAction: 'Pass servername in tls options when connecting to Redis cluster',
      scope: 'global',
      sourceExperience: 'Task: Redis cache setup, failed with ECONNRESET',
      confidence: 0.5,
    });

    // 7. Add multiple successful validation evidence entries
    learningService.addEvidence(lesson.id, {
      experience: 'Verified Redis cluster connection with TLS SNI',
      outcome: 'success',
      context: 'Integration test suite passed',
    });
    learningService.addEvidence(lesson.id, {
      experience: 'Staging environment deployment connected cleanly',
      outcome: 'success',
      context: 'Staging health check passed',
    });
    learningService.addEvidence(lesson.id, {
      experience: 'Production stress test zero dropped connections',
      outcome: 'success',
      context: 'Load test passed',
    });

    // Promote to validated (confidence is now 3/3 = 1.0 >= 0.7)
    const promoted = learningService.promote(lesson.id);
    expect(promoted?.status).toBe('validated');
    expect(promoted?.confidence).toBe(1.0);

    // 8. Future task: Subsequent agent receives a task mentioning "Redis cache"
    const futureContext = engine.generate({
      task: 'Redis cache connection setup',
      projectId,
    });

    const redisLearning = futureContext.items.find(
      (i) => i.type === 'learning' && i.content.includes('Clustered Redis'),
    );
    expect(redisLearning).toBeDefined();
    expect(redisLearning?.reason).toContain('Validated pattern');
  });
});
