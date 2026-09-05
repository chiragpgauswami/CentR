import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createIsolatedWorkspace } from '../src/runner/isolation.js';

describe('Run Isolation', () => {
  const fixturePath = path.resolve('fixtures/sample-project');

  it('creates an isolated ephemeral workspace and copies fixture content', () => {
    const { workspaceDir, cleanup } = createIsolatedWorkspace(fixturePath);

    try {
      expect(fs.existsSync(workspaceDir)).toBe(true);
      expect(fs.existsSync(path.join(workspaceDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(workspaceDir, 'src'))).toBe(true);

      // Writes in isolated workspace do not mutate fixture
      fs.writeFileSync(path.join(workspaceDir, 'test-temp.txt'), 'ephemeral data', 'utf8');
      expect(fs.existsSync(path.join(workspaceDir, 'test-temp.txt'))).toBe(true);
      expect(fs.existsSync(path.join(fixturePath, 'test-temp.txt'))).toBe(false);
    } finally {
      cleanup();
    }

    // After cleanup, workspaceDir should be cleanly removed
    expect(fs.existsSync(workspaceDir)).toBe(false);
  });

  it('creates a minimal valid project if fixture does not exist', () => {
    const nonExistent = path.resolve('non-existent-fixture-path-999');
    const { workspaceDir, cleanup } = createIsolatedWorkspace(nonExistent);

    try {
      expect(fs.existsSync(workspaceDir)).toBe(true);
      expect(fs.existsSync(path.join(workspaceDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(workspaceDir, 'src'))).toBe(true);
    } finally {
      cleanup();
    }

    expect(fs.existsSync(workspaceDir)).toBe(false);
  });
});
