import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeFileHash,
  detectLanguage,
  discoverFiles,
  isEntryPoint,
  isTestFile,
} from '../src/indexer/discovery.js';

describe('Discovery Module', () => {
  const fixturePath = path.resolve('fixtures/sample-project');

  describe('detectLanguage', () => {
    it('detects typescript', () => {
      expect(detectLanguage('app.ts')).toBe('typescript');
      expect(detectLanguage('component.tsx')).toBe('typescript');
    });

    it('detects javascript', () => {
      expect(detectLanguage('index.js')).toBe('javascript');
      expect(detectLanguage('index.jsx')).toBe('javascript');
      expect(detectLanguage('server.mjs')).toBe('javascript');
      expect(detectLanguage('module.cjs')).toBe('javascript');
    });

    it('detects json, markdown, yaml', () => {
      expect(detectLanguage('data.json')).toBe('json');
      expect(detectLanguage('README.md')).toBe('markdown');
      expect(detectLanguage('config.yml')).toBe('yaml');
      expect(detectLanguage('config.yaml')).toBe('yaml');
    });

    it('returns unknown for unsupported extensions', () => {
      expect(detectLanguage('archive.tar')).toBe('unknown');
      expect(detectLanguage('image.png')).toBe('unknown');
    });
  });

  describe('isTestFile', () => {
    it('identifies test files by name pattern', () => {
      expect(isTestFile('user.test.ts')).toBe(true);
      expect(isTestFile('user.spec.js')).toBe(true);
      expect(isTestFile('tests/validation.ts')).toBe(true);
      expect(isTestFile('__tests__/auth.ts')).toBe(true);
    });

    it('returns false for normal source files', () => {
      expect(isTestFile('user.service.ts')).toBe(false);
      expect(isTestFile('src/index.ts')).toBe(false);
      expect(isTestFile('package.json')).toBe(false);
    });
  });

  describe('isEntryPoint', () => {
    it('identifies entry point files', () => {
      expect(isEntryPoint('index.ts')).toBe(true);
      expect(isEntryPoint('main.js')).toBe(true);
      expect(isEntryPoint('src/index.ts')).toBe(true);
      expect(isEntryPoint('src/main.ts')).toBe(true);
      expect(isEntryPoint('server.ts')).toBe(true);
      expect(isEntryPoint('app.js')).toBe(true);
    });

    it('returns false for non-entry files', () => {
      expect(isEntryPoint('src/services/auth.ts')).toBe(false);
      expect(isEntryPoint('src/controllers/user.controller.ts')).toBe(false);
    });
  });

  describe('computeFileHash', () => {
    it('returns consistent sha256 hash', () => {
      const file = path.join(fixturePath, 'package.json');
      const hash1 = computeFileHash(file);
      const hash2 = computeFileHash(file);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('discoverFiles', () => {
    it('discovers all non-ignored, non-secret files in fixture', () => {
      const files = discoverFiles({ rootPath: fixturePath });
      expect(files.length).toBeGreaterThan(0);

      const paths = files.map((f) => f.relativePath);

      // Should include TypeScript source files
      expect(paths).toContain('src/index.ts');
      expect(paths).toContain('src/controllers/user.controller.ts');
      expect(paths).toContain('src/services/auth.service.ts');
      expect(paths).toContain('src/services/database.service.ts');

      // Should include test file
      expect(paths).toContain('tests/validation.test.ts');
      const testFile = files.find((f) => f.relativePath === 'tests/validation.test.ts');
      expect(testFile?.isTest).toBe(true);

      // Should NEVER include .env or .pem secret files
      expect(paths).not.toContain('.env');
      expect(paths).not.toContain('server.pem');

      // Entry point should be flagged
      const entryFile = files.find((f) => f.relativePath === 'src/index.ts');
      expect(entryFile?.isEntryPoint).toBe(true);
    });

    it('handles symlink loops without infinite recursion', async () => {
      const fs = await import('fs');
      const os = await import('os');
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-symlink-'));
      try {
        const subDir = path.join(tempDir, 'subdir');
        fs.mkdirSync(subDir);
        fs.writeFileSync(path.join(subDir, 'file.ts'), 'export const x = 1;');
        try {
          fs.symlinkSync(tempDir, path.join(subDir, 'loop'), 'dir');
        } catch {
          // Skip if symlinks not permitted
        }
        const files = discoverFiles({ rootPath: tempDir });
        expect(files.length).toBeGreaterThan(0);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('skips files containing secret credentials in file content', async () => {
      const fs = await import('fs');
      const os = await import('os');
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-secret-test-'));
      try {
        fs.writeFileSync(path.join(tempDir, 'safe.ts'), 'export const a = 1;');
        fs.writeFileSync(
          path.join(tempDir, 'config.ts'),
          'const key = "-----BEGIN RSA PRIVATE KEY-----\\nsecret\\n-----END RSA PRIVATE KEY-----";',
        );
        const files = discoverFiles({ rootPath: tempDir });
        const paths = files.map((f) => f.relativePath);
        expect(paths).toContain('safe.ts');
        expect(paths).not.toContain('config.ts');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
