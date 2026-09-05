import fs from 'fs';
import { parseFile } from '../parser/index.js';
import type { CentrDatabase } from '../storage/database.js';
import type { Project, SyncResult } from '../types.js';
import { detectProject, readDependencies } from './detector.js';
import { computeFileHash, discoverFiles } from './discovery.js';

export interface IndexResult {
  project: Project;
  filesIndexed: number;
  symbolsIndexed: number;
  dependenciesCount: number;
  testsDetected: number;
  timeTaken: number;
}

export async function initializeProject(rootPath: string, db: CentrDatabase): Promise<IndexResult> {
  const startTime = Date.now();

  const projectInfo = detectProject(rootPath);

  // Check if project already exists for idempotency
  const existingProject = db.get('SELECT * FROM projects WHERE rootPath = ?', [
    projectInfo.rootPath,
  ]) as Project | undefined;

  let projectId: number;

  if (existingProject) {
    projectId = existingProject.id;
    db.run(
      `UPDATE projects SET name = ?, language = ?, framework = ?, packageManager = ?, description = ?, updatedAt = datetime('now') WHERE id = ?`,
      [
        projectInfo.name,
        projectInfo.language,
        projectInfo.framework,
        projectInfo.packageManager,
        projectInfo.description,
        projectId,
      ],
    );

    // Clean up old index entries for clean re-initialization
    db.run('DELETE FROM files_fts WHERE rowid IN (SELECT id FROM files WHERE projectId = ?)', [
      projectId,
    ]);
    db.run('DELETE FROM symbols_fts WHERE rowid IN (SELECT id FROM symbols WHERE projectId = ?)', [
      projectId,
    ]);
    db.run('DELETE FROM dependencies WHERE projectId = ?', [projectId]);
    db.run('DELETE FROM files WHERE projectId = ?', [projectId]);
  } else {
    const insertProjectResult = db.run(
      `INSERT INTO projects (name, rootPath, language, framework, packageManager, description, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        projectInfo.name,
        projectInfo.rootPath,
        projectInfo.language,
        projectInfo.framework,
        projectInfo.packageManager,
        projectInfo.description,
      ],
    );
    projectId = insertProjectResult.lastInsertRowid;
  }

  const project: Project = {
    id: projectId,
    name: projectInfo.name,
    rootPath: projectInfo.rootPath,
    language: projectInfo.language,
    framework: projectInfo.framework,
    packageManager: projectInfo.packageManager,
    description: projectInfo.description,
    createdAt: existingProject?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const files = discoverFiles({ rootPath });

  let filesIndexed = 0;
  let symbolsIndexed = 0;
  let testsDetected = 0;

  db.transaction(() => {
    for (const file of files) {
      const content = fs.readFileSync(file.path, 'utf8');
      const hash = computeFileHash(file.path);

      const fileRes = db.run(
        `INSERT INTO files (projectId, path, relativePath, language, size, hash, lastIndexed, isTest, isEntryPoint)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
        [
          projectId,
          file.path,
          file.relativePath,
          file.language,
          file.size,
          hash,
          file.isTest ? 1 : 0,
          file.isEntryPoint ? 1 : 0,
        ],
      );

      const fileId = fileRes.lastInsertRowid;
      filesIndexed++;
      if (file.isTest) testsDetected++;

      const parseResult = parseFile(file.path, content, file.language);

      for (const sym of parseResult.symbols) {
        const symRes = db.run(
          `INSERT INTO symbols (fileId, projectId, name, qualifiedName, kind, signature, line, endLine, column, exported)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fileId,
            projectId,
            sym.name,
            sym.qualifiedName,
            sym.kind,
            sym.signature,
            sym.line,
            sym.endLine,
            sym.column,
            sym.exported ? 1 : 0,
          ],
        );
        db.run(
          `INSERT INTO symbols_fts (rowid, name, qualifiedName, signature) VALUES (?, ?, ?, ?)`,
          [symRes.lastInsertRowid, sym.name, sym.qualifiedName, sym.signature ?? ''],
        );
        symbolsIndexed++;
      }

      for (const imp of parseResult.imports) {
        db.run(
          `INSERT INTO imports (fileId, projectId, source, specifiers, isDefault, isNamespace, line)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            fileId,
            projectId,
            imp.source,
            JSON.stringify(imp.specifiers),
            imp.isDefault ? 1 : 0,
            imp.isNamespace ? 1 : 0,
            imp.line,
          ],
        );
      }

      for (const exp of parseResult.exports) {
        db.run(
          `INSERT INTO exports (fileId, projectId, name, kind, isDefault, line)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [fileId, projectId, exp.name, exp.kind, exp.isDefault ? 1 : 0, exp.line],
        );
      }

      for (const ref of parseResult.references) {
        db.run(
          `INSERT INTO references_table (fileId, projectId, symbolName, line, column)
           VALUES (?, ?, ?, ?, ?)`,
          [fileId, projectId, ref.symbolName, ref.line, ref.column],
        );
      }

      // Update FTS
      db.run(`INSERT INTO files_fts (rowid, relativePath) VALUES (?, ?)`, [
        fileId,
        file.relativePath,
      ]);
    }

    const dependencies = readDependencies(rootPath);
    for (const dep of dependencies) {
      db.run(
        `INSERT INTO dependencies (projectId, name, version, isDev, isPeer) VALUES (?, ?, ?, ?, ?)`,
        [projectId, dep.name, dep.version, dep.isDev ? 1 : 0, dep.isPeer ? 1 : 0],
      );
    }
  });

  const dependenciesCount = readDependencies(rootPath).length;

  return {
    project,
    filesIndexed,
    symbolsIndexed,
    dependenciesCount,
    testsDetected,
    timeTaken: Date.now() - startTime,
  };
}

export async function syncProject(
  projectId: number,
  rootPath: string,
  db: CentrDatabase,
): Promise<SyncResult> {
  const startTime = Date.now();

  const currentFiles = discoverFiles({ rootPath });
  const existingFiles = db.all('SELECT * FROM files WHERE projectId = ?', [projectId]) as Array<{
    id: number;
    path: string;
    hash: string;
    relativePath: string;
  }>;

  const existingMap = new Map<string, { id: number; hash: string; relativePath: string }>();
  for (const ef of existingFiles) {
    existingMap.set(ef.path, ef);
  }

  const currentMap = new Map<string, (typeof currentFiles)[0]>();
  for (const cf of currentFiles) {
    currentMap.set(cf.path, cf);
  }

  let filesAdded = 0;
  let filesChanged = 0;
  let filesDeleted = 0;
  let filesUnchanged = 0;
  let symbolsUpdated = 0;

  db.transaction(() => {
    // Check for deleted files
    for (const [path, existing] of existingMap.entries()) {
      if (!currentMap.has(path)) {
        db.run(`DELETE FROM files_fts WHERE rowid = ?`, [existing.id]);
        db.run(`DELETE FROM symbols_fts WHERE rowid IN (SELECT id FROM symbols WHERE fileId = ?)`, [
          existing.id,
        ]);
        db.run(`DELETE FROM files WHERE id = ?`, [existing.id]);
        filesDeleted++;
      }
    }

    // Check for added/changed files
    for (const file of currentFiles) {
      const hash = computeFileHash(file.path);
      const content = fs.readFileSync(file.path, 'utf8');
      const existing = existingMap.get(file.path);

      if (!existing) {
        // Add
        const fileRes = db.run(
          `INSERT INTO files (projectId, path, relativePath, language, size, hash, lastIndexed, isTest, isEntryPoint)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
          [
            projectId,
            file.path,
            file.relativePath,
            file.language,
            file.size,
            hash,
            file.isTest ? 1 : 0,
            file.isEntryPoint ? 1 : 0,
          ],
        );
        const fileId = fileRes.lastInsertRowid;
        filesAdded++;

        const parseResult = parseFile(file.path, content, file.language);
        for (const sym of parseResult.symbols) {
          const symRes = db.run(
            `INSERT INTO symbols (fileId, projectId, name, qualifiedName, kind, signature, line, endLine, column, exported)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              fileId,
              projectId,
              sym.name,
              sym.qualifiedName,
              sym.kind,
              sym.signature,
              sym.line,
              sym.endLine,
              sym.column,
              sym.exported ? 1 : 0,
            ],
          );
          db.run(
            `INSERT INTO symbols_fts (rowid, name, qualifiedName, signature) VALUES (?, ?, ?, ?)`,
            [symRes.lastInsertRowid, sym.name, sym.qualifiedName, sym.signature ?? ''],
          );
          symbolsUpdated++;
        }
        for (const imp of parseResult.imports) {
          db.run(
            `INSERT INTO imports (fileId, projectId, source, specifiers, isDefault, isNamespace, line)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              fileId,
              projectId,
              imp.source,
              JSON.stringify(imp.specifiers),
              imp.isDefault ? 1 : 0,
              imp.isNamespace ? 1 : 0,
              imp.line,
            ],
          );
        }
        for (const exp of parseResult.exports) {
          db.run(
            `INSERT INTO exports (fileId, projectId, name, kind, isDefault, line)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [fileId, projectId, exp.name, exp.kind, exp.isDefault ? 1 : 0, exp.line],
          );
        }
        for (const ref of parseResult.references) {
          db.run(
            `INSERT INTO references_table (fileId, projectId, symbolName, line, column)
             VALUES (?, ?, ?, ?, ?)`,
            [fileId, projectId, ref.symbolName, ref.line, ref.column],
          );
        }
        db.run(`INSERT INTO files_fts (rowid, relativePath) VALUES (?, ?)`, [
          fileId,
          file.relativePath,
        ]);
      } else if (existing.hash !== hash) {
        // Change
        db.run(`UPDATE files SET hash = ?, size = ?, lastIndexed = datetime('now') WHERE id = ?`, [
          hash,
          file.size,
          existing.id,
        ]);
        db.run(`DELETE FROM symbols_fts WHERE rowid IN (SELECT id FROM symbols WHERE fileId = ?)`, [
          existing.id,
        ]);
        db.run(`DELETE FROM symbols WHERE fileId = ?`, [existing.id]);
        db.run(`DELETE FROM imports WHERE fileId = ?`, [existing.id]);
        db.run(`DELETE FROM exports WHERE fileId = ?`, [existing.id]);
        db.run(`DELETE FROM references_table WHERE fileId = ?`, [existing.id]);
        db.run(`UPDATE files_fts SET relativePath = ? WHERE rowid = ?`, [
          file.relativePath,
          existing.id,
        ]);

        filesChanged++;

        const parseResult = parseFile(file.path, content, file.language);
        for (const sym of parseResult.symbols) {
          const symRes = db.run(
            `INSERT INTO symbols (fileId, projectId, name, qualifiedName, kind, signature, line, endLine, column, exported)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              existing.id,
              projectId,
              sym.name,
              sym.qualifiedName,
              sym.kind,
              sym.signature,
              sym.line,
              sym.endLine,
              sym.column,
              sym.exported ? 1 : 0,
            ],
          );
          db.run(
            `INSERT INTO symbols_fts (rowid, name, qualifiedName, signature) VALUES (?, ?, ?, ?)`,
            [symRes.lastInsertRowid, sym.name, sym.qualifiedName, sym.signature ?? ''],
          );
          symbolsUpdated++;
        }
        for (const imp of parseResult.imports) {
          db.run(
            `INSERT INTO imports (fileId, projectId, source, specifiers, isDefault, isNamespace, line)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              existing.id,
              projectId,
              imp.source,
              JSON.stringify(imp.specifiers),
              imp.isDefault ? 1 : 0,
              imp.isNamespace ? 1 : 0,
              imp.line,
            ],
          );
        }
        for (const exp of parseResult.exports) {
          db.run(
            `INSERT INTO exports (fileId, projectId, name, kind, isDefault, line)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [existing.id, projectId, exp.name, exp.kind, exp.isDefault ? 1 : 0, exp.line],
          );
        }
        for (const ref of parseResult.references) {
          db.run(
            `INSERT INTO references_table (fileId, projectId, symbolName, line, column)
             VALUES (?, ?, ?, ?, ?)`,
            [existing.id, projectId, ref.symbolName, ref.line, ref.column],
          );
        }
      } else {
        filesUnchanged++;
      }
    }
  });

  return {
    filesAdded,
    filesChanged,
    filesDeleted,
    filesUnchanged,
    symbolsUpdated,
    timeTaken: Date.now() - startTime,
  };
}
