import { MemoryError } from '../errors.js';
import { toFtsQuery } from '../search/index.js';
import type { CentrDatabase } from '../storage/database.js';
import type { MemoryCategory, ProjectMemory } from '../types.js';

export class ProjectMemoryService {
  constructor(private db: CentrDatabase) {}

  create(data: {
    projectId: number;
    title: string;
    content: string;
    category: MemoryCategory;
    source: string;
    confidence?: number;
    tags?: string[];
  }): ProjectMemory {
    try {
      return this.db.transaction(() => {
        const now = new Date().toISOString();
        const sql = `
          INSERT INTO project_memory (projectId, title, content, category, source, confidence, tags, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const stmt = this.db.getDb().prepare(sql);
        const tagsJson = JSON.stringify(data.tags || []);
        const info = stmt.run(
          data.projectId,
          data.title,
          data.content,
          data.category,
          data.source,
          data.confidence ?? 1.0,
          tagsJson,
          now,
          now,
        );

        const ftsSql = `
          INSERT INTO memory_fts (rowid, title, content, tags)
          VALUES (?, ?, ?, ?)
        `;
        this.db
          .getDb()
          .prepare(ftsSql)
          .run(info.lastInsertRowid, data.title, data.content, tagsJson);

        return this.getById(info.lastInsertRowid as number)!;
      });
    } catch (error) {
      throw new MemoryError(
        'Failed to create project memory',
        error instanceof Error ? error : undefined,
      );
    }
  }

  search(projectId: number, query: string, limit: number = 20): ProjectMemory[] {
    try {
      const ftsQuery = toFtsQuery(query);
      const sql = `
        SELECT pm.*, (-bm25(memory_fts)) as relevance
        FROM memory_fts
        JOIN project_memory pm ON memory_fts.rowid = pm.id
        WHERE memory_fts MATCH ? AND pm.projectId = ?
        ORDER BY relevance DESC
        LIMIT ?
      `;
      return this.db.getDb().prepare(sql).all(ftsQuery, projectId, limit) as ProjectMemory[];
    } catch (error) {
      throw new MemoryError(
        'Failed to search project memory',
        error instanceof Error ? error : undefined,
      );
    }
  }

  getById(id: number): ProjectMemory | null {
    try {
      const sql = `SELECT * FROM project_memory WHERE id = ?`;
      const row = this.db.getDb().prepare(sql).get(id) as ProjectMemory | undefined;
      return row || null;
    } catch (error) {
      throw new MemoryError(
        'Failed to get project memory by id',
        error instanceof Error ? error : undefined,
      );
    }
  }

  getByProject(projectId: number, category?: MemoryCategory): ProjectMemory[] {
    try {
      let sql = `SELECT * FROM project_memory WHERE projectId = ?`;
      const params: any[] = [projectId];
      if (category) {
        sql += ` AND category = ?`;
        params.push(category);
      }
      return this.db
        .getDb()
        .prepare(sql)
        .all(...params) as ProjectMemory[];
    } catch (error) {
      throw new MemoryError(
        'Failed to get project memories',
        error instanceof Error ? error : undefined,
      );
    }
  }

  update(
    id: number,
    data: Partial<Omit<ProjectMemory, 'id' | 'projectId' | 'createdAt'>>,
  ): ProjectMemory | null {
    try {
      return this.db.transaction(() => {
        const current = this.getById(id);
        if (!current) return null;

        const updates: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined) {
            updates.push(`${key} = ?`);
            params.push(key === 'tags' && Array.isArray(value) ? JSON.stringify(value) : value);
          }
        }

        if (updates.length === 0) return current;

        updates.push('updatedAt = ?');
        params.push(new Date().toISOString());
        params.push(id);

        const sql = `UPDATE project_memory SET ${updates.join(', ')} WHERE id = ?`;
        this.db
          .getDb()
          .prepare(sql)
          .run(...params);

        const updated = this.getById(id)!;
        const ftsSql = `
          UPDATE memory_fts 
          SET title = ?, content = ?, tags = ?
          WHERE rowid = ?
        `;
        this.db.getDb().prepare(ftsSql).run(updated.title, updated.content, updated.tags, id);

        return updated;
      });
    } catch (error) {
      throw new MemoryError(
        'Failed to update project memory',
        error instanceof Error ? error : undefined,
      );
    }
  }

  delete(id: number): boolean {
    try {
      return this.db.transaction(() => {
        this.db.getDb().prepare(`DELETE FROM memory_fts WHERE rowid = ?`).run(id);
        const info = this.db.getDb().prepare(`DELETE FROM project_memory WHERE id = ?`).run(id);
        return info.changes > 0;
      });
    } catch (error) {
      throw new MemoryError(
        'Failed to delete project memory',
        error instanceof Error ? error : undefined,
      );
    }
  }
}
