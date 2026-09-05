import { DatabaseError } from '../errors.js';
import { toFtsQuery } from '../search/index.js';
import type { CentrDatabase } from '../storage/database.js';
import type { Skill } from '../types.js';

export class SkillsService {
  constructor(private db: CentrDatabase) {}

  record(data: {
    name: string;
    description: string;
    trigger: string;
    instructions: string;
    category: string;
    source: string;
    scope?: string;
    confidence?: number;
  }): Skill {
    try {
      return this.db.transaction(() => {
        const now = new Date().toISOString();
        const sql = `
          INSERT INTO skills (name, description, trigger, instructions, category, source, scope, confidence, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const info = this.db
          .getDb()
          .prepare(sql)
          .run(
            data.name,
            data.description,
            data.trigger,
            data.instructions,
            data.category,
            data.source,
            data.scope || 'global',
            data.confidence ?? 1.0,
            now,
            now,
          );

        const ftsSql = `
          INSERT INTO skills_fts (rowid, name, description, trigger, instructions)
          VALUES (?, ?, ?, ?, ?)
        `;
        this.db
          .getDb()
          .prepare(ftsSql)
          .run(info.lastInsertRowid, data.name, data.description, data.trigger, data.instructions);

        return this.getById(info.lastInsertRowid as number)!;
      });
    } catch (error) {
      throw new DatabaseError('Failed to record skill', error instanceof Error ? error : undefined);
    }
  }

  search(query: string, limit: number = 20): Skill[] {
    try {
      const ftsQuery = toFtsQuery(query);
      const sql = `
        SELECT s.*, (-bm25(skills_fts)) as relevance
        FROM skills_fts
        JOIN skills s ON skills_fts.rowid = s.id
        WHERE skills_fts MATCH ?
        ORDER BY relevance DESC
        LIMIT ?
      `;
      return this.db.getDb().prepare(sql).all(ftsQuery, limit) as Skill[];
    } catch (error) {
      throw new DatabaseError(
        'Failed to search skills',
        error instanceof Error ? error : undefined,
      );
    }
  }

  getById(id: number): Skill | null {
    try {
      const sql = `SELECT * FROM skills WHERE id = ?`;
      return (this.db.getDb().prepare(sql).get(id) as Skill) || null;
    } catch (error) {
      throw new DatabaseError(
        'Failed to get skill by id',
        error instanceof Error ? error : undefined,
      );
    }
  }

  getAll(limit?: number): Skill[] {
    try {
      let sql = `SELECT * FROM skills ORDER BY createdAt DESC`;
      if (limit) sql += ` LIMIT ${limit}`;
      return this.db.getDb().prepare(sql).all() as Skill[];
    } catch (error) {
      throw new DatabaseError(
        'Failed to get all skills',
        error instanceof Error ? error : undefined,
      );
    }
  }

  update(id: number, data: Partial<Omit<Skill, 'id' | 'createdAt'>>): Skill | null {
    try {
      return this.db.transaction(() => {
        const current = this.getById(id);
        if (!current) return null;

        const updates: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined) {
            updates.push(`${key} = ?`);
            params.push(value);
          }
        }

        if (updates.length === 0) return current;

        updates.push('updatedAt = ?');
        params.push(new Date().toISOString());
        params.push(id);

        const sql = `UPDATE skills SET ${updates.join(', ')} WHERE id = ?`;
        this.db
          .getDb()
          .prepare(sql)
          .run(...params);

        const updated = this.getById(id)!;
        const ftsSql = `
          UPDATE skills_fts 
          SET name = ?, description = ?, trigger = ?, instructions = ?
          WHERE rowid = ?
        `;
        this.db
          .getDb()
          .prepare(ftsSql)
          .run(updated.name, updated.description, updated.trigger, updated.instructions, id);

        return updated;
      });
    } catch (error) {
      throw new DatabaseError('Failed to update skill', error instanceof Error ? error : undefined);
    }
  }

  delete(id: number): boolean {
    try {
      return this.db.transaction(() => {
        this.db.getDb().prepare(`DELETE FROM skills_fts WHERE rowid = ?`).run(id);
        const info = this.db.getDb().prepare(`DELETE FROM skills WHERE id = ?`).run(id);
        return info.changes > 0;
      });
    } catch (error) {
      throw new DatabaseError('Failed to delete skill', error instanceof Error ? error : undefined);
    }
  }
}
