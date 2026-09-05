import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { containsSecretContent, isIgnoredDirectory, isSecretFile } from '../security/index.js';

export interface DiscoveryOptions {
  rootPath: string;
  ignorePatterns?: string[];
  secretPatterns?: string[];
  maxFileSize?: number; // bytes, default 1MB
}

export interface DiscoveredFile {
  path: string;
  relativePath: string;
  language: string;
  size: number;
  isTest: boolean;
  isEntryPoint: boolean;
}

export function parseGitignore(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

export function matchesGitignore(relPath: string, isDir: boolean, patterns: string[]): boolean {
  for (const pattern of patterns) {
    let cleanPattern = pattern;
    const isDirOnly = cleanPattern.endsWith('/');
    if (isDirOnly) {
      cleanPattern = cleanPattern.slice(0, -1);
      if (!isDir) continue;
    }
    if (cleanPattern.startsWith('/')) {
      cleanPattern = cleanPattern.slice(1);
    }
    if (cleanPattern.includes('*')) {
      const regexStr =
        '^' +
        cleanPattern
          .replace(/\./g, '\\.')
          .replace(/\*\*/g, '.*')
          .replace(/(?<!\.)\*/g, '[^/]*') +
        '($|/)';
      try {
        if (
          new RegExp(regexStr).test(relPath) ||
          new RegExp(regexStr).test(path.basename(relPath))
        ) {
          return true;
        }
      } catch {
        // Fallback to literal check
      }
    } else {
      const basename = path.basename(relPath);
      if (
        relPath === cleanPattern ||
        relPath.startsWith(cleanPattern + '/') ||
        basename === cleanPattern
      ) {
        return true;
      }
    }
  }
  return false;
}

export function discoverFiles(options: DiscoveryOptions): DiscoveredFile[] {
  const maxFileSize = options.maxFileSize || 1024 * 1024;
  const discovered: DiscoveredFile[] = [];
  const visitedRealDirs = new Set<string>();

  // Load .gitignore if present in root
  const gitignorePath = path.join(options.rootPath, '.gitignore');
  let gitignorePatterns: string[] = [];
  if (fs.existsSync(gitignorePath)) {
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      gitignorePatterns = parseGitignore(gitignoreContent);
    } catch {
      // Ignore read errors
    }
  }

  function walk(currentDir: string) {
    let realDir: string;
    try {
      realDir = fs.realpathSync(currentDir);
    } catch {
      return;
    }

    // Prevent symlink cycles and infinite recursion
    if (visitedRealDirs.has(realDir)) {
      return;
    }
    visitedRealDirs.add(realDir);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(options.rootPath, fullPath);

      if (entry.isDirectory()) {
        if (isIgnoredDirectory(entry.name, options.ignorePatterns)) {
          continue;
        }
        if (matchesGitignore(relativePath, true, gitignorePatterns)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        if (
          isSecretFile(entry.name, options.secretPatterns) ||
          isSecretFile(relativePath, options.secretPatterns)
        ) {
          continue;
        }

        if (matchesGitignore(relativePath, false, gitignorePatterns)) {
          continue;
        }

        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        if (stat.isDirectory()) {
          // In case entry was a symlink to directory
          walk(fullPath);
          continue;
        }

        if (stat.size > maxFileSize) {
          continue;
        }

        const language = detectLanguage(fullPath);
        if (language === 'unknown') {
          continue;
        }

        // Check file content for secrets
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (containsSecretContent(content)) {
            continue;
          }
        } catch {
          // If unreadable as text, skip
          continue;
        }

        discovered.push({
          path: fullPath,
          relativePath,
          language,
          size: stat.size,
          isTest: isTestFile(relativePath),
          isEntryPoint: isEntryPoint(relativePath),
        });
      }
    }
  }

  walk(options.rootPath);
  return discovered.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
    case '.cjs':
    case '.mjs':
      return 'javascript';
    case '.json':
      return 'json';
    case '.md':
      return 'markdown';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.toml':
      return 'toml';
    default:
      return 'unknown';
  }
}

export function isTestFile(relativePath: string): boolean {
  const parts = relativePath.split(path.sep);
  if (parts.some((p) => p === '__tests__' || p === 'tests' || p === 'test')) {
    return true;
  }
  return /\.test\.[tj]sx?$/.test(relativePath) || /\.spec\.[tj]sx?$/.test(relativePath);
}

export function isEntryPoint(relativePath: string): boolean {
  const parts = relativePath.split(path.sep);
  if (parts.length === 1 || (parts.length === 2 && parts[0] === 'src')) {
    const name = parts[parts.length - 1];
    return /^(index|main|app|server)\.[tj]sx?$/.test(name);
  }
  return false;
}

export function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}
