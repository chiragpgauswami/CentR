import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeProject, syncProject } from '../src/indexer/index.js';
import { CentrDatabase } from '../src/storage/database.js';

describe('Indexer & Incremental Sync', () => {
  let tmpWorkDir: string;
  let db: CentrDatabase;

  beforeEach(() => {
    tmpWorkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-idx-'));
    const centrDir = path.join(tmpWorkDir, '.centr');
    fs.mkdirSync(centrDir, { recursive: true });

    db = new CentrDatabase(path.join(centrDir, 'centr.db'));
    db.initialize();

    // Copy fixture files into tmpWorkDir
    const fixturePath = path.resolve('fixtures/sample-project');
    fs.cpSync(fixturePath, tmpWorkDir, { recursive: true });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpWorkDir, { recursive: true, force: true });
  });

  it('initializes project completely', async () => {
    const res = await initializeProject(tmpWorkDir, db);

    expect(res.project).toBeDefined();
    expect(res.project.name).toBe('sample-project');
    expect(res.project.language).toBe('typescript');
    expect(res.filesIndexed).toBeGreaterThan(0);
    expect(res.symbolsIndexed).toBeGreaterThan(0);
    expect(res.dependenciesCount).toBeGreaterThan(0);
    expect(res.testsDetected).toBeGreaterThanOrEqual(1);
    expect(res.timeTaken).toBeGreaterThanOrEqual(0);

    // Verify secret files were NOT indexed
    const files = db.all<{ relativePath: string }>(
      'SELECT relativePath FROM files WHERE projectId = ?',
      [res.project.id],
    );
    const filePaths = files.map((f) => f.relativePath);

    expect(filePaths).not.toContain('.env');
    expect(filePaths).not.toContain('server.pem');
  });

  it('performs incremental sync: detects unchanged, added, modified, deleted files', async () => {
    const initRes = await initializeProject(tmpWorkDir, db);
    const projectId = initRes.project.id;

    // First sync with no changes -> all unchanged
    const sync1 = await syncProject(projectId, tmpWorkDir, db);
    expect(sync1.filesAdded).toBe(0);
    expect(sync1.filesChanged).toBe(0);
    expect(sync1.filesDeleted).toBe(0);
    expect(sync1.filesUnchanged).toBe(initRes.filesIndexed);

    // 1. Add a new file
    const newFilePath = path.join(tmpWorkDir, 'src/new-feature.ts');
    fs.writeFileSync(newFilePath, 'export function newFeature(): string { return "done"; }');

    // 2. Modify an existing file
    const modFilePath = path.join(tmpWorkDir, 'src/index.ts');
    fs.appendFileSync(modFilePath, '\n// modified line');

    // 3. Delete a file
    const delFilePath = path.join(tmpWorkDir, 'src/middleware/error-handler.ts');
    fs.unlinkSync(delFilePath);

    // Run incremental sync
    const sync2 = await syncProject(projectId, tmpWorkDir, db);

    expect(sync2.filesAdded).toBe(1);
    expect(sync2.filesChanged).toBe(1);
    expect(sync2.filesDeleted).toBe(1);
    expect(sync2.symbolsUpdated).toBeGreaterThan(0);

    // Verify DB reflects the change
    const deletedInDb = db.get('SELECT id FROM files WHERE projectId = ? AND relativePath LIKE ?', [
      projectId,
      '%error-handler.ts%',
    ]);
    expect(deletedInDb).toBeUndefined();

    const addedInDb = db.get<{ id: number }>(
      'SELECT id FROM files WHERE projectId = ? AND relativePath = ?',
      [projectId, 'src/new-feature.ts'],
    );
    expect(addedInDb).toBeDefined();

    // Verify symbols for new file exist
    const newSym = db.get<{ name: string }>('SELECT name FROM symbols WHERE fileId = ?', [
      addedInDb?.id,
    ]);
    expect(newSym?.name).toBe('newFeature');
  });

  it('is idempotent when initializeProject is called multiple times on the same rootPath', async () => {
    const init1 = await initializeProject(tmpWorkDir, db);
    const init2 = await initializeProject(tmpWorkDir, db);

    expect(init2.project.id).toBe(init1.project.id);
    const projectCount = db.get<{ count: number }>('SELECT COUNT(*) as count FROM projects');
    expect(projectCount?.count).toBe(1);

    // References should be populated
    const references = db.all<{ symbolName: string }>(
      'SELECT symbolName FROM references_table WHERE projectId = ?',
      [init1.project.id],
    );
    expect(references.length).toBeGreaterThan(0);
  });
});
