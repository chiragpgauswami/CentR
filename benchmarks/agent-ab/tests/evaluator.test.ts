import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ObjectiveEvaluator } from '../src/evaluator/index.js';
import { createIsolatedWorkspace } from '../src/runner/isolation.js';
import type { BenchmarkTask } from '../src/tasks/types.js';

describe('Objective Evaluator', () => {
  const evaluator = new ObjectiveEvaluator();
  const fixturePath = path.resolve('fixtures/sample-project');

  it('evaluates passing conditions when expected files, strings, and absent forbidden strings match', () => {
    const { workspaceDir, cleanup } = createIsolatedWorkspace(fixturePath);

    try {
      const mockTask: BenchmarkTask = {
        id: 'eval-pass-001',
        category: 'testing',
        retrievalClass: 'class_1_exact',
        difficulty: 'easy',
        title: 'Mock Pass Task',
        prompt: 'Do something simple',
        expectedBehavior: ['File exists'],
        relevantFiles: ['src/index.ts'],
        validation: {
          expectedFiles: ['src/index.ts'],
          requiredStrings: [{ file: 'src/index.ts', pattern: 'console' }],
          forbiddenStrings: [{ file: 'src/index.ts', pattern: 'DO_NOT_INCLUDE_THIS' }],
        },
      };

      // Ensure required string is present and forbidden is absent
      fs.writeFileSync(path.join(workspaceDir, 'src/index.ts'), 'console.log("hello");', 'utf8');

      const result = evaluator.evaluate(workspaceDir, mockTask);
      expect(result.success).toBe(true);
      expect(result.expectedFilesPresent).toBe(true);
      expect(result.requiredStringsMatched).toBe(true);
      expect(result.forbiddenStringsAbsent).toBe(true);
      expect(result.failureReasons).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it('evaluates failing condition when expected file is missing', () => {
    const { workspaceDir, cleanup } = createIsolatedWorkspace(fixturePath);

    try {
      const mockTask: BenchmarkTask = {
        id: 'eval-fail-file',
        category: 'testing',
        retrievalClass: 'class_1_exact',
        difficulty: 'easy',
        title: 'Missing File Task',
        prompt: 'Check missing file',
        expectedBehavior: ['Missing file'],
        relevantFiles: ['src/nonexistent.ts'],
        validation: {
          expectedFiles: ['src/nonexistent.ts'],
        },
      };

      const result = evaluator.evaluate(workspaceDir, mockTask);
      expect(result.success).toBe(false);
      expect(result.expectedFilesPresent).toBe(false);
      expect(result.failureReasons).toContain('Expected file missing: src/nonexistent.ts');
    } finally {
      cleanup();
    }
  });

  it('evaluates failing condition when forbidden string is present', () => {
    const { workspaceDir, cleanup } = createIsolatedWorkspace(fixturePath);

    try {
      const mockTask: BenchmarkTask = {
        id: 'eval-fail-forbidden',
        category: 'testing',
        retrievalClass: 'class_1_exact',
        difficulty: 'easy',
        title: 'Forbidden String Task',
        prompt: 'Check forbidden string',
        expectedBehavior: ['No forbidden string'],
        relevantFiles: ['src/index.ts'],
        validation: {
          forbiddenStrings: [{ file: 'src/index.ts', pattern: 'FORBIDDEN_KEYWORD' }],
        },
      };

      fs.writeFileSync(
        path.join(workspaceDir, 'src/index.ts'),
        'const x = "FORBIDDEN_KEYWORD";',
        'utf8',
      );

      const result = evaluator.evaluate(workspaceDir, mockTask);
      expect(result.success).toBe(false);
      expect(result.forbiddenStringsAbsent).toBe(false);
      expect(result.failureReasons.some((r) => r.includes('contains forbidden string'))).toBe(true);
    } finally {
      cleanup();
    }
  });
});
