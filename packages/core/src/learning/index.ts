import { LearningError } from '../errors.js';
import { toFtsQuery } from '../search/index.js';
import type { CentrDatabase } from '../storage/database.js';
import type { Learning, LearningEvidence, LearningStatus } from '../types.js';

export class LearningService {
  constructor(private db: CentrDatabase) {}

  record(data: {
    lesson: string;
    category: string;
    trigger: string;
    recommendedAction: string;
    scope: string;
    sourceExperience: string;
    confidence?: number;
  }): Learning {
    try {
      return this.db.transaction(() => {
        // Check for existing duplicate lesson
        const existing = this.db
          .getDb()
          .prepare('SELECT id FROM learning WHERE lesson = ? AND trigger = ?')
          .get(data.lesson, data.trigger) as { id: number } | undefined;

        if (existing) {
          return this.getById(existing.id)!;
        }

        const now = new Date().toISOString();
        const sql = `
          INSERT INTO learning (lesson, category, trigger, recommendedAction, scope, sourceExperience, confidence, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?)
        `;
        const confidence = data.confidence ?? 0.5;
        const info = this.db
          .getDb()
          .prepare(sql)
          .run(
            data.lesson,
            data.category,
            data.trigger,
            data.recommendedAction,
            data.scope,
            data.sourceExperience,
            confidence,
            now,
            now,
          );

        const ftsSql = `
          INSERT INTO learning_fts (rowid, lesson, trigger, recommendedAction)
          VALUES (?, ?, ?, ?)
        `;
        this.db
          .getDb()
          .prepare(ftsSql)
          .run(info.lastInsertRowid, data.lesson, data.trigger, data.recommendedAction);

        return this.getById(info.lastInsertRowid as number)!;
      });
    } catch (error) {
      throw new LearningError(
        'Failed to record learning',
        error instanceof Error ? error : undefined,
      );
    }
  }

  search(query: string, limit: number = 20): Learning[] {
    try {
      const ftsQuery = toFtsQuery(query);
      const sql = `
        SELECT l.*, (-bm25(learning_fts)) as relevance
        FROM learning_fts
        JOIN learning l ON learning_fts.rowid = l.id
        WHERE learning_fts MATCH ?
        ORDER BY l.confidence DESC, relevance DESC
        LIMIT ?
      `;
      return this.db.getDb().prepare(sql).all(ftsQuery, limit) as Learning[];
    } catch (error) {
      throw new LearningError(
        'Failed to search learning',
        error instanceof Error ? error : undefined,
      );
    }
  }

  getById(id: number): Learning | null {
    try {
      const sql = `SELECT * FROM learning WHERE id = ?`;
      return (this.db.getDb().prepare(sql).get(id) as Learning) || null;
    } catch (error) {
      throw new LearningError(
        'Failed to get learning by id',
        error instanceof Error ? error : undefined,
      );
    }
  }

  getByStatus(status: LearningStatus): Learning[] {
    try {
      const sql = `SELECT * FROM learning WHERE status = ? ORDER BY confidence DESC`;
      return this.db.getDb().prepare(sql).all(status) as Learning[];
    } catch (error) {
      throw new LearningError(
        'Failed to get learning by status',
        error instanceof Error ? error : undefined,
      );
    }
  }

  addEvidence(
    learningId: number,
    data: {
      experience: string;
      outcome: 'success' | 'failure';
      context: string;
    },
  ): LearningEvidence {
    try {
      return this.db.transaction(() => {
        const now = new Date().toISOString();
        const insertSql = `
          INSERT INTO learning_evidence (learningId, experience, outcome, context, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `;
        const info = this.db
          .getDb()
          .prepare(insertSql)
          .run(learningId, data.experience, data.outcome, data.context, now);

        const countsSql = `
          SELECT 
            SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successCount,
            COUNT(*) as totalCount
          FROM learning_evidence
          WHERE learningId = ?
        `;
        const counts = this.db.getDb().prepare(countsSql).get(learningId) as {
          successCount: number;
          totalCount: number;
        };

        let newConfidence = counts.successCount / counts.totalCount;
        if (newConfidence < 0.1) newConfidence = 0.1;

        this.updateConfidence(learningId, newConfidence);

        const getEvSql = `SELECT * FROM learning_evidence WHERE id = ?`;
        return this.db.getDb().prepare(getEvSql).get(info.lastInsertRowid) as LearningEvidence;
      });
    } catch (error) {
      throw new LearningError(
        'Failed to add learning evidence',
        error instanceof Error ? error : undefined,
      );
    }
  }

  getEvidence(learningId: number): LearningEvidence[] {
    try {
      const sql = `SELECT * FROM learning_evidence WHERE learningId = ?`;
      return this.db.getDb().prepare(sql).all(learningId) as LearningEvidence[];
    } catch (error) {
      throw new LearningError(
        'Failed to get learning evidence',
        error instanceof Error ? error : undefined,
      );
    }
  }

  updateConfidence(id: number, confidence: number): void {
    try {
      const sql = `UPDATE learning SET confidence = ?, updatedAt = ? WHERE id = ?`;
      this.db.getDb().prepare(sql).run(confidence, new Date().toISOString(), id);
    } catch (error) {
      throw new LearningError(
        'Failed to update confidence',
        error instanceof Error ? error : undefined,
      );
    }
  }

  promote(id: number): Learning | null {
    try {
      return this.db.transaction(() => {
        const learning = this.getById(id);
        if (!learning) return null;
        if (learning.confidence < 0.7) return null;

        const sql = `UPDATE learning SET status = 'validated', updatedAt = ? WHERE id = ?`;
        this.db.getDb().prepare(sql).run(new Date().toISOString(), id);
        return this.getById(id);
      });
    } catch (error) {
      throw new LearningError(
        'Failed to promote learning',
        error instanceof Error ? error : undefined,
      );
    }
  }

  reject(id: number): Learning | null {
    try {
      return this.db.transaction(() => {
        const sql = `UPDATE learning SET status = 'rejected', updatedAt = ? WHERE id = ?`;
        this.db.getDb().prepare(sql).run(new Date().toISOString(), id);
        return this.getById(id);
      });
    } catch (error) {
      throw new LearningError(
        'Failed to reject learning',
        error instanceof Error ? error : undefined,
      );
    }
  }

  getValidated(limit?: number): Learning[] {
    try {
      if (limit !== undefined) {
        const sql = `SELECT * FROM learning WHERE status = 'validated' ORDER BY confidence DESC LIMIT ?`;
        return this.db.getDb().prepare(sql).all(limit) as Learning[];
      }
      const sql = `SELECT * FROM learning WHERE status = 'validated' ORDER BY confidence DESC`;
      return this.db.getDb().prepare(sql).all() as Learning[];
    } catch (error) {
      throw new LearningError(
        'Failed to get validated learning',
        error instanceof Error ? error : undefined,
      );
    }
  }
}
