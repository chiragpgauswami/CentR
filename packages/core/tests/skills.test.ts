import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SkillsService } from '../src/skills/index.js';
import { CentrDatabase } from '../src/storage/database.js';

describe('Skills Registry Service', () => {
  let tmpDir: string;
  let db: CentrDatabase;
  let skillsService: SkillsService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-skills-'));
    db = new CentrDatabase(path.join(tmpDir, 'test.db'));
    db.initialize();
    skillsService = new SkillsService(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('records and retrieves skills', () => {
    const skill = skillsService.record({
      name: 'fast-debug-auth',
      description: 'Quickly isolate authentication and token issues',
      trigger: 'auth failure 401 403 jwt invalid',
      instructions: '1. Check JWT secret\n2. Verify expiration\n3. Inspect header format',
      category: 'debugging',
      source: 'team-playbook',
      confidence: 0.9,
    });

    expect(skill).toBeDefined();
    expect(skill.id).toBeGreaterThan(0);
    expect(skill.name).toBe('fast-debug-auth');

    const fetched = skillsService.getById(skill.id);
    expect(fetched?.name).toBe('fast-debug-auth');
  });

  it('searches skills via FTS', () => {
    skillsService.record({
      name: 'database-migration-check',
      description: 'Validate schema version before running migrations',
      trigger: 'database migration error',
      instructions: 'Check schema_version table in SQLite',
      category: 'database',
      source: 'manual',
    });

    const results = skillsService.search('migration');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('database-migration-check');
  });

  it('updates and deletes skills', () => {
    const skill = skillsService.record({
      name: 'temp-skill',
      description: 'temporary',
      trigger: 'temp',
      instructions: 'none',
      category: 'misc',
      source: 'test',
    });

    skillsService.update(skill.id, { description: 'updated description' });
    const updated = skillsService.getById(skill.id);
    expect(updated?.description).toBe('updated description');

    const deleted = skillsService.delete(skill.id);
    expect(deleted).toBe(true);
    expect(skillsService.getById(skill.id)).toBeNull();
  });
});
