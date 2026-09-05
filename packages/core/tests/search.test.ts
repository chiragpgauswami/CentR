import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeProject } from '../src/indexer/index.js';
import { SearchEngine } from '../src/search/index.js';
import { CentrDatabase } from '../src/storage/database.js';

describe('Search Engine', () => {
  let tmpDir: string;
  let db: CentrDatabase;
  let searchEngine: SearchEngine;
  let projectId: number;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-search-'));
    db = new CentrDatabase(path.join(tmpDir, 'test.db'));
    db.initialize();

    const fixturePath = path.resolve('fixtures/sample-project');
    const initRes = await initializeProject(fixturePath, db);
    projectId = initRes.project.id;
    searchEngine = new SearchEngine(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('searches for symbols using exact and FTS matching', () => {
    const results = searchEngine.search({
      query: 'UserController',
      projectId,
      limit: 10,
    });

    expect(results.length).toBeGreaterThan(0);
    const userCtrl = results.find((r) => r.symbol === 'UserController');
    expect(userCtrl).toBeDefined();
    expect(userCtrl?.type).toBe('symbol');
    expect(userCtrl?.file).toContain('user.controller.ts');
  });

  it('searches for files by path', () => {
    const results = searchEngine.searchFiles(projectId, 'auth', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.file.includes('auth.service.ts'))).toBe(true);
  });

  it('searches symbols specifically', () => {
    const results = searchEngine.searchSymbols(projectId, 'AuthService', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.symbol === 'AuthService')).toBe(true);
  });

  it('looks up a specific symbol with full details', () => {
    const detail = searchEngine.lookupSymbol(projectId, 'UserController');
    expect(detail).toBeDefined();
    expect(detail?.symbol.name).toBe('UserController');
    expect(detail?.symbol.kind).toBe('class');
    expect(detail?.file.relativePath).toContain('user.controller.ts');
  });

  it('returns null for non-existent symbol', () => {
    const detail = searchEngine.lookupSymbol(projectId, 'NonExistentService');
    expect(detail).toBeNull();
  });

  it('searches dependencies by name', () => {
    const deps = searchEngine.searchDependencies(projectId, 'express');
    expect(deps.length).toBeGreaterThan(0);
    expect(deps[0].name).toBe('express');
  });
});
