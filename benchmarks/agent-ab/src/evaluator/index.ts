import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { BenchmarkTask } from '../tasks/types.js';
import type { EvaluationResult } from './types.js';

export * from './types.js';

export class ObjectiveEvaluator {
  evaluate(workingDir: string, task: BenchmarkTask): EvaluationResult {
    const failureReasons: string[] = [];
    let expectedFilesPresent = true;
    let requiredStringsMatched = true;
    let forbiddenStringsAbsent = true;
    let testsExecuted = false;
    let testsPassed = true;
    let testsPassedCount = 0;
    let testsFailedCount = 0;
    let typecheckPassed = true;
    let lintPassed = true;

    // 1. Check expected files
    if (task.validation.expectedFiles) {
      for (const relFile of task.validation.expectedFiles) {
        const fullPath = path.join(workingDir, relFile);
        if (!fs.existsSync(fullPath)) {
          expectedFilesPresent = false;
          failureReasons.push(`Expected file missing: ${relFile}`);
        }
      }
    }

    // 2. Check required strings
    if (task.validation.requiredStrings) {
      for (const req of task.validation.requiredStrings) {
        const fullPath = path.join(workingDir, req.file);
        if (!fs.existsSync(fullPath)) {
          requiredStringsMatched = false;
          failureReasons.push(`File missing for required string check: ${req.file}`);
          continue;
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        if (!content.includes(req.pattern)) {
          requiredStringsMatched = false;
          failureReasons.push(
            `File ${req.file} does not contain required string: "${req.pattern}"`,
          );
        }
      }
    }

    // 3. Check forbidden strings
    if (task.validation.forbiddenStrings) {
      for (const forb of task.validation.forbiddenStrings) {
        const fullPath = path.join(workingDir, forb.file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes(forb.pattern)) {
            forbiddenStringsAbsent = false;
            failureReasons.push(`File ${forb.file} contains forbidden string: "${forb.pattern}"`);
          }
        }
      }
    }

    // 4. Run test commands if specified
    if (task.validation.commands && task.validation.commands.length > 0) {
      testsExecuted = true;
      const binDir = path.resolve('node_modules/.bin');
      const envPath = process.env.PATH ? `${binDir}:${process.env.PATH}` : binDir;
      for (const cmdStr of task.validation.commands) {
        const [cmd, ...args] = cmdStr.split(' ');
        try {
          execFileSync(cmd!, args, {
            cwd: workingDir,
            encoding: 'utf8',
            timeout: 30000,
            env: { ...process.env, PATH: envPath, NO_COLOR: '1' },
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          testsPassedCount++;
        } catch (err: unknown) {
          testsPassed = false;
          testsFailedCount++;
          const msg = err instanceof Error ? err.message : String(err);
          failureReasons.push(`Validation command failed: "${cmdStr}" - ${msg.slice(0, 150)}`);
        }
      }
    }

    const success =
      expectedFilesPresent &&
      requiredStringsMatched &&
      forbiddenStringsAbsent &&
      (!testsExecuted || testsPassed);

    const requiresManualReview =
      !testsExecuted &&
      (!task.validation.requiredStrings || task.validation.requiredStrings.length === 0);

    return {
      success,
      requiresManualReview,
      testsExecuted,
      testsPassed,
      testsPassedCount,
      testsFailedCount,
      typecheckPassed,
      lintPassed,
      expectedFilesPresent,
      requiredStringsMatched,
      forbiddenStringsAbsent,
      failureReasons,
    };
  }
}
