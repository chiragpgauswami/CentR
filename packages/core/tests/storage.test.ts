import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CentrDatabase } from '../src/storage/database.js';

describe('Storage & Database Module', () => {
  let tmpDir: string;
  let dbPath: string;
  let db: CentrDatabase;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-test-'));
    dbPath = path.join(tmpDir, 'test.db');
    db = new CentrDatabase(dbPath);
    db.initialize();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('initializes schema and runs migrations', () => {
    const versionRow = db.get<{ version: number }>(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1',
    );
    expect(versionRow).toBeDefined();
    expect(versionRow?.version).toBeGreaterThanOrEqual(1);
  });

  it('creates all core tables', () => {
    const tables = db
      .all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .map((r) => r.name);

    expect(tables).toContain('projects');
    expect(tables).toContain('files');
    expect(tables).toContain('symbols');
    expect(tables).toContain('imports');
    expect(tables).toContain('exports');
    expect(tables).toContain('dependencies');
    expect(tables).toContain('project_memory');
    expect(tables).toContain('learning');
    expect(tables).toContain('learning_evidence');
    expect(tables).toContain('skills');
    expect(tables).toContain('sessions');
  });

  it('supports transactions and rollbacks on error', () => {
    try {
      db.transaction(() => {
        db.run(
          "INSERT INTO projects (name, rootPath, language) VALUES ('Test1', '/test1', 'typescript')",
        );
        throw new Error('Simulated failure');
      });
    } catch {
      // Expected
    }

    const projects = db.all('SELECT * FROM projects');
    expect(projects).toHaveLength(0);
  });

  it('supports run, get, and all convenience methods with parameters', () => {
    const insert = db.run('INSERT INTO projects (name, rootPath, language) VALUES (?, ?, ?)', [
      'MyProject',
      '/my/project',
      'typescript',
    ]);
    expect(insert.lastInsertRowid).toBeGreaterThan(0);

    const project = db.get<{ name: string; language: string }>(
      'SELECT name, language FROM projects WHERE id = ?',
      [insert.lastInsertRowid],
    );
    expect(project).toBeDefined();
    expect(project?.name).toBe('MyProject');
    expect(project?.language).toBe('typescript');

    const all = db.all('SELECT * FROM projects WHERE language = ?', ['typescript']);
    expect(all).toHaveLength(1);
  });

  it('enforces foreign keys', () => {
    expect(() => {
      db.run(
        'INSERT INTO files (projectId, path, relativePath, language, size, hash) VALUES (9999, "/a", "a", "ts", 10, "h")',
      );
    }).toThrow();
  });

  it('sets PRAGMA user_version to match schema_version', () => {
    const userVersion = db.getDb().pragma('user_version', { simple: true });
    expect(userVersion).toBe(1);
  });

  it('enforces unique constraints on projects rootPath and files path per project', () => {
    db.run("INSERT INTO projects (name, rootPath, language) VALUES ('P1', '/p1', 'ts')");
    expect(() => {
      db.run(
        "INSERT INTO projects (name, rootPath, language) VALUES ('P1 Duplicate', '/p1', 'ts')",
      );
    }).toThrow();

    const proj = db.get<{ id: number }>("SELECT id FROM projects WHERE rootPath = '/p1'");
    db.run(
      'INSERT INTO files (projectId, path, relativePath, language, size, hash) VALUES (?, ?, ?, ?, ?, ?)',
      [proj!.id, '/p1/file.ts', 'file.ts', 'typescript', 10, 'hash1'],
    );
    expect(() => {
      db.run(
        'INSERT INTO files (projectId, path, relativePath, language, size, hash) VALUES (?, ?, ?, ?, ?, ?)',
        [proj!.id, '/p1/file.ts', 'file.ts', 'typescript', 10, 'hash2'],
      );
    }).toThrow();
  });
});
