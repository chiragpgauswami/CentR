import path from 'path';
import { SecurityError, ValidationError } from '../errors.js';

export const DEFAULT_SECRET_PATTERNS: string[] = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  '*.jks',
  'credentials.json',
  'service-account.json',
  'service-account-*.json',
  '*.keystore',
  '.htpasswd',
  '.netrc',
  '*.gpg',
  '*.asc',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  '*.secret',
  'secrets.yml',
  'secrets.yaml',
  'vault.yml',
  'vault.yaml',
  'token.json',
  'tokens.json',
];

export const DEFAULT_IGNORE_DIRS: string[] = [
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  'target',
  'vendor',
  '.git',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
  '.centr',
  '.turbo',
  'out',
];

export const SECRET_CONTENT_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/,
  /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /gho_[a-zA-Z0-9]{36}/,
  /glpat-[a-zA-Z0-9\-_]{20,}/,
  /xox[baprs]-[0-9a-zA-Z]{10,48}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /(?:password|passwd|secret|api_key|apikey|access_token|private_key)\s*[:=]\s*['"][a-zA-Z0-9\-_=+/.~!@#$%^&*()]{16,}['"]/i,
];

function matchPattern(name: string, pattern: string): boolean {
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return regex.test(name);
  }
  return name === pattern;
}

export function isSecretFile(filePath: string, patterns: string[] = []): boolean {
  const basename = path.basename(filePath);
  const allPatterns = [...DEFAULT_SECRET_PATTERNS, ...patterns];
  return allPatterns.some(
    (pattern) => matchPattern(basename, pattern) || matchPattern(filePath, pattern),
  );
}

export function containsSecretContent(content: string): boolean {
  return SECRET_CONTENT_PATTERNS.some((pattern) => pattern.test(content));
}

export function isIgnoredDirectory(dirName: string, patterns: string[] = []): boolean {
  const allPatterns = [...DEFAULT_IGNORE_DIRS, ...patterns];
  return allPatterns.some((pattern) => matchPattern(dirName, pattern));
}

export function sanitizePath(rootPath: string, inputPath: string): string {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedInput = path.resolve(rootPath, inputPath);

  const relative = path.relative(resolvedRoot, resolvedInput);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new SecurityError(`Path traversal detected: ${inputPath}`);
  }

  return resolvedInput;
}

export function sanitizeForLogging(content: string): string {
  let sanitized = content;
  sanitized = sanitized.replace(
    /(key|password|token|secret|credentials|auth)\s*([:=])\s*['"]?[a-zA-Z0-9\-_=+/.]+['"]?/gi,
    '$1$2[REDACTED]',
  );
  sanitized = sanitized.replace(/bearer\s+[a-zA-Z0-9\-_=+/.]+/gi, 'Bearer [REDACTED]');
  sanitized = sanitized.replace(/(sk-[a-zA-Z0-9]{6,}|ghp_[a-zA-Z0-9]{6,})/gi, '[REDACTED]');
  return sanitized;
}

export function validateInput(input: string, maxLength?: number): string {
  if (input.includes('\0')) {
    throw new ValidationError('Input contains null bytes');
  }
  let trimmed = input.trim();
  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(`Input exceeds max length of ${maxLength}`);
  }
  return trimmed;
}
