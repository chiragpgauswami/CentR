import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectMemoryService } from '../src/memory/index.js';
import { CentrDatabase } from '../src/storage/database.js';

describe('Project Memory Service', () => {
  let tmpDir: string;
  let db: CentrDatabase;
  let memoryService: ProjectMemoryService;
  let project1Id: number;
  let project2Id: number;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-mem-'));
    db = new CentrDatabase(path.join(tmpDir, 'test.db'));
    db.initialize();
    memoryService = new ProjectMemoryService(db);

    // Create 2 projects to test isolation
    const p1 = db.run(
      "INSERT INTO projects (name, rootPath, language) VALUES ('ProjectA', '/projA', 'typescript')",
    );
    project1Id = p1.lastInsertRowid;

    const p2 = db.run(
      "INSERT INTO projects (name, rootPath, language) VALUES ('ProjectB', '/projB', 'python')",
    );
    project2Id = p2.lastInsertRowid;
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates and retrieves a project memory item', () => {
    const mem = memoryService.create({
      projectId: project1Id,
      title: 'Database Migration Pattern',
      content: 'Always use schema_version table to track SQLite migrations',
      category: 'decision',
      source: 'docs/db.md',
      confidence: 0.95,
      tags: ['sqlite', 'migrations'],
    });

    expect(mem).toBeDefined();
    expect(mem.id).toBeGreaterThan(0);
    expect(mem.title).toBe('Database Migration Pattern');
    expect(mem.category).toBe('decision');

    const fetched = memoryService.getById(mem.id);
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('Database Migration Pattern');
  });

  it('enforces project memory isolation', () => {
    memoryService.create({
      projectId: project1Id,
      title: 'Secret Key Schema for Project A',
      content: 'Use KMS for Project A',
      category: 'architecture',
      source: 'spec.md',
    });

    memoryService.create({
      projectId: project2Id,
      title: 'Database for Project B',
      content: 'Use PostgreSQL for Project B',
      category: 'architecture',
      source: 'spec.md',
    });

    const proj1Mems = memoryService.getByProject(project1Id);
    expect(proj1Mems).toHaveLength(1);
    expect(proj1Mems[0].title).toBe('Secret Key Schema for Project A');

    const proj2Mems = memoryService.getByProject(project2Id);
    expect(proj2Mems).toHaveLength(1);
    expect(proj2Mems[0].title).toBe('Database for Project B');

    // Search in project 1 does NOT return project 2's memories
    const p1Search = memoryService.search(project1Id, 'PostgreSQL');
    expect(p1Search).toHaveLength(0);
  });

  it('searches memory using FTS', () => {
    memoryService.create({
      projectId: project1Id,
      title: 'Authentication Strategy',
      content: 'Using JWT with asymmetric RS256 keys',
      category: 'decision',
      source: 'auth.md',
      tags: ['auth', 'jwt'],
    });

    memoryService.create({
      projectId: project1Id,
      title: 'Logging Strategy',
      content: 'JSON structured logs to stdout',
      category: 'architecture',
      source: 'log.md',
    });

    const searchRes = memoryService.search(project1Id, 'asymmetric');
    expect(searchRes.length).toBeGreaterThan(0);
    expect(searchRes[0].title).toBe('Authentication Strategy');
  });

  it('updates and deletes project memory', () => {
    const mem = memoryService.create({
      projectId: project1Id,
      title: 'Temporary Note',
      content: 'Will be deleted',
      category: 'discovery',
      source: 'notes.md',
    });

    const updated = memoryService.update(mem.id, {
      title: 'Updated Note',
      content: 'New content',
    });
    expect(updated?.title).toBe('Updated Note');

    const deleted = memoryService.delete(mem.id);
    expect(deleted).toBe(true);

    const check = memoryService.getById(mem.id);
    expect(check).toBeNull();
  });
});
