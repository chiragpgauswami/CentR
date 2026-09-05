import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SecurityError, ValidationError } from '../src/errors.js';
import {
  containsSecretContent,
  isIgnoredDirectory,
  isSecretFile,
  sanitizeForLogging,
  sanitizePath,
  validateInput,
} from '../src/security/index.js';

describe('Security Module', () => {
  describe('isSecretFile', () => {
    it('detects common secret files', () => {
      expect(isSecretFile('.env')).toBe(true);
      expect(isSecretFile('.env.local')).toBe(true);
      expect(isSecretFile('.env.production')).toBe(true);
      expect(isSecretFile('server.pem')).toBe(true);
      expect(isSecretFile('private.key')).toBe(true);
      expect(isSecretFile('cert.p12')).toBe(true);
      expect(isSecretFile('credentials.json')).toBe(true);
      expect(isSecretFile('service-account.json')).toBe(true);
      expect(isSecretFile('service-account-prod.json')).toBe(true);
      expect(isSecretFile('id_rsa')).toBe(true);
      expect(isSecretFile('id_ed25519')).toBe(true);
      expect(isSecretFile('app.secret')).toBe(true);
      expect(isSecretFile('secrets.yml')).toBe(true);
      expect(isSecretFile('secrets.yaml')).toBe(true);
      expect(isSecretFile('vault.yaml')).toBe(true);
      expect(isSecretFile('token.json')).toBe(true);
    });

    it('does not flag normal source files', () => {
      expect(isSecretFile('index.ts')).toBe(false);
      expect(isSecretFile('src/auth.service.ts')).toBe(false);
      expect(isSecretFile('package.json')).toBe(false);
      expect(isSecretFile('README.md')).toBe(false);
      expect(isSecretFile('tsconfig.json')).toBe(false);
    });

    it('handles nested paths', () => {
      expect(isSecretFile('config/.env')).toBe(true);
      expect(isSecretFile('certs/server.pem')).toBe(true);
      expect(isSecretFile('keys/id_rsa')).toBe(true);
    });

    it('respects custom secret patterns', () => {
      expect(isSecretFile('my-token.txt', ['*.txt'])).toBe(true);
      expect(isSecretFile('other.dat', ['*.txt'])).toBe(false);
    });
  });

  describe('isIgnoredDirectory', () => {
    it('identifies standard ignored directories', () => {
      expect(isIgnoredDirectory('node_modules')).toBe(true);
      expect(isIgnoredDirectory('dist')).toBe(true);
      expect(isIgnoredDirectory('build')).toBe(true);
      expect(isIgnoredDirectory('coverage')).toBe(true);
      expect(isIgnoredDirectory('.git')).toBe(true);
      expect(isIgnoredDirectory('.centr')).toBe(true);
      expect(isIgnoredDirectory('vendor')).toBe(true);
    });

    it('allows source directories', () => {
      expect(isIgnoredDirectory('src')).toBe(false);
      expect(isIgnoredDirectory('lib')).toBe(false);
      expect(isIgnoredDirectory('packages')).toBe(false);
      expect(isIgnoredDirectory('tests')).toBe(false);
    });

    it('respects custom ignore patterns', () => {
      expect(isIgnoredDirectory('custom_cache', ['custom_cache'])).toBe(true);
      expect(isIgnoredDirectory('normal_dir', ['custom_cache'])).toBe(false);
    });
  });

  describe('sanitizePath', () => {
    const root = '/app/project';

    it('resolves safe relative paths within root', () => {
      const result = sanitizePath(root, 'src/index.ts');
      expect(result).toBe(path.resolve(root, 'src/index.ts'));
    });

    it('resolves safe nested paths', () => {
      const result = sanitizePath(root, 'src/services/auth.ts');
      expect(result).toBe(path.resolve(root, 'src/services/auth.ts'));
    });

    it('rejects path traversal attempts with ../', () => {
      expect(() => sanitizePath(root, '../../etc/passwd')).toThrow(SecurityError);
    });

    it('rejects absolute paths outside root', () => {
      expect(() => sanitizePath(root, '/etc/passwd')).toThrow(SecurityError);
    });

    it('rejects paths that resolve outside project root', () => {
      expect(() => sanitizePath(root, 'src/../../outside.txt')).toThrow(SecurityError);
    });

    it('rejects sibling directories that start with the root name (prefix attack)', () => {
      expect(() => sanitizePath('/app/project', '../project-evil/file.txt')).toThrow(SecurityError);
      expect(() => sanitizePath('/tmp/foo', '../foobar/secret.txt')).toThrow(SecurityError);
    });
  });

  describe('containsSecretContent', () => {
    it('detects RSA private keys', () => {
      const content =
        '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----';
      expect(containsSecretContent(content)).toBe(true);
    });

    it('detects AWS access keys', () => {
      const content = 'const awsKey = "AKIAIOSFODNN7EXAMPLE";';
      expect(containsSecretContent(content)).toBe(true);
    });

    it('detects GitHub tokens', () => {
      const content = 'const token = "ghp_123456789012345678901234567890123456";';
      expect(containsSecretContent(content)).toBe(true);
    });

    it('does not flag normal code', () => {
      const code = `
        export function add(a: number, b: number): number {
          return a + b;
        }
      `;
      expect(containsSecretContent(code)).toBe(false);
    });
  });

  describe('sanitizeForLogging', () => {
    it('redacts API keys and secrets', () => {
      const input = 'Error connecting with api_key=sk-1234567890abcdef and password=supersecret';
      const output = sanitizeForLogging(input);
      expect(output).not.toContain('sk-1234567890abcdef');
      expect(output).not.toContain('supersecret');
      expect(output).toContain('[REDACTED]');
    });

    it('redacts tokens and bearer credentials', () => {
      const input = 'Authorization: Bearer my-secret-jwt-token-value';
      const output = sanitizeForLogging(input);
      expect(output).not.toContain('my-secret-jwt-token-value');
      expect(output).toContain('[REDACTED]');
    });

    it('leaves safe log strings intact', () => {
      const input = 'Indexing completed for 45 files successfully';
      expect(sanitizeForLogging(input)).toBe(input);
    });
  });

  describe('validateInput', () => {
    it('trims input whitespace', () => {
      expect(validateInput('  hello world  ')).toBe('hello world');
    });

    it('rejects null bytes', () => {
      expect(() => validateInput('hello\0world')).toThrow(ValidationError);
    });

    it('enforces maximum length', () => {
      expect(() => validateInput('a'.repeat(200), 100)).toThrow(ValidationError);
      expect(validateInput('a'.repeat(50), 100)).toBe('a'.repeat(50));
    });
  });
});
