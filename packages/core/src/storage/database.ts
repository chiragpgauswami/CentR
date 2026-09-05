import Database from 'better-sqlite3';
import { DatabaseError } from '../errors.js';
import { runMigrations } from './migrations.js';

export class CentrDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    try {
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
    } catch (error) {
      throw new DatabaseError(
        `Failed to open database at ${dbPath}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  initialize(): void {
    try {
      runMigrations(this.db);
    } catch (error) {
      throw new DatabaseError(
        'Failed to initialize database schema',
        error instanceof Error ? error : undefined,
      );
    }
  }

  close(): void {
    try {
      if (this.db.open) {
        this.db.close();
      }
    } catch (error) {
      throw new DatabaseError(
        'Failed to close database',
        error instanceof Error ? error : undefined,
      );
    }
  }

  transaction<T>(fn: () => T): T {
    try {
      const tx = this.db.transaction(fn);
      return tx();
    } catch (error) {
      throw new DatabaseError('Transaction failed', error instanceof Error ? error : undefined);
    }
  }

  getDb(): Database.Database {
    return this.db;
  }

  exec(sql: string): void {
    try {
      this.db.exec(sql);
    } catch (error) {
      throw new DatabaseError('Failed to execute SQL', error instanceof Error ? error : undefined);
    }
  }

  run(sql: string, params: unknown[] = []): { lastInsertRowid: number; changes: number } {
    try {
      const stmt = this.db.prepare(sql);
      const res = stmt.run(...params);
      return { lastInsertRowid: Number(res.lastInsertRowid), changes: res.changes };
    } catch (error) {
      throw new DatabaseError(
        'Failed to run SQL query',
        error instanceof Error ? error : undefined,
      );
    }
  }

  get<T = unknown>(sql: string, params: unknown[] = []): T | undefined {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(...params) as T | undefined;
    } catch (error) {
      throw new DatabaseError(
        'Failed to execute SQL get',
        error instanceof Error ? error : undefined,
      );
    }
  }

  all<T = unknown>(sql: string, params: unknown[] = []): T[] {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as T[];
    } catch (error) {
      throw new DatabaseError(
        'Failed to execute SQL all',
        error instanceof Error ? error : undefined,
      );
    }
  }
}
