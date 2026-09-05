import { SearchError } from '../errors.js';
import type { CentrDatabase } from '../storage/database.js';
import type { SearchOptions, SearchResult } from '../types.js';

export interface SymbolDetail {
  symbol: {
    name: string;
    qualifiedName: string;
    kind: string;
    signature: string | null;
    line: number;
    exported: boolean;
  };
  file: { path: string; relativePath: string; language: string };
  references: Array<{ file: string; line: number }>;
  relatedImports: Array<{ file: string; source: string }>;
}

export interface DependencyResult {
  name: string;
  version: string;
  isDev: boolean;
  isPeer: boolean;
  usedIn: string[];
}

const STEM_ALIASES: Record<string, string[]> = {
  authentication: ['auth'],
  authenticate: ['auth'],
  authorization: ['auth'],
  controllers: ['controller'],
  databases: ['database', 'db'],
  database: ['db'],
  repositories: ['repository', 'repo'],
  repository: ['repo'],
  services: ['service'],
  configurations: ['config'],
  configuration: ['config'],
  tests: ['test'],
  testing: ['test'],
};

export function toFtsQuery(query: string): string {
  const words = query
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (words.length === 0) return '""';

  const expanded: string[] = [];
  for (const w of words) {
    expanded.push(w);
    const lower = w.toLowerCase();
    if (STEM_ALIASES[lower]) {
      expanded.push(...STEM_ALIASES[lower]);
    }
  }

  const unique = Array.from(new Set(expanded));
  return unique.map((w) => `"${w.replace(/"/g, '""')}"*`).join(' OR ');
}

export class SearchEngine {
  constructor(private db: CentrDatabase) {}

  search(options: SearchOptions): SearchResult[] {
    try {
      const limit = options.limit ?? 20;
      const query = options.query;
      const ftsQuery = toFtsQuery(query);

      const sql = `
        WITH
        file_fts_matches AS (
          SELECT
            f.path as file,
            NULL as symbol,
            NULL as line,
            'file' as type,
            (-bm25(files_fts)) * 2.0 as relevance,
            snippet(files_fts, 0, '<b>', '</b>', '...', 64) as excerpt,
            f.language
          FROM files_fts
          JOIN files f ON files_fts.rowid = f.id
          WHERE files_fts MATCH ? AND f.projectId = ?
        ),
        symbol_fts_matches AS (
          SELECT
            f.path as file,
            s.name as symbol,
            s.line as line,
            'symbol' as type,
            (-bm25(symbols_fts)) * 3.0 as relevance,
            snippet(symbols_fts, 0, '<b>', '</b>', '...', 64) as excerpt,
            f.language
          FROM symbols_fts
          JOIN symbols s ON symbols_fts.rowid = s.id
          JOIN files f ON s.fileId = f.id
          WHERE symbols_fts MATCH ? AND f.projectId = ?
        ),
        memory_fts_matches AS (
          SELECT
            pm.source as file,
            pm.title as symbol,
            NULL as line,
            'memory' as type,
            (-bm25(memory_fts)) * 2.5 as relevance,
            snippet(memory_fts, 1, '<b>', '</b>', '...', 64) as excerpt,
            'text' as language
          FROM memory_fts
          JOIN project_memory pm ON memory_fts.rowid = pm.id
          WHERE memory_fts MATCH ? AND pm.projectId = ?
        ),
        exact_symbol_matches AS (
          SELECT
            f.path as file,
            s.name as symbol,
            s.line as line,
            'symbol' as type,
            50.0 as relevance,
            IFNULL(s.signature, s.name) as excerpt,
            f.language
          FROM symbols s
          JOIN files f ON s.fileId = f.id
          WHERE s.name = ? AND s.projectId = ?
        ),
        file_path_matches AS (
          SELECT
            f.path as file,
            NULL as symbol,
            NULL as line,
            'file' as type,
            1.0 as relevance,
            f.path as excerpt,
            f.language
          FROM files f
          WHERE f.path LIKE '%' || ? || '%' AND f.projectId = ?
        ),
        all_results AS (
          SELECT * FROM file_fts_matches
          UNION ALL
          SELECT * FROM symbol_fts_matches
          UNION ALL
          SELECT * FROM memory_fts_matches
          UNION ALL
          SELECT * FROM exact_symbol_matches
          UNION ALL
          SELECT * FROM file_path_matches
        ),
        deduped_results AS (
          SELECT 
            file,
            symbol,
            line,
            type,
            MAX(relevance) as relevance,
            excerpt,
            language
          FROM all_results
          GROUP BY file, line
        )
        SELECT * FROM deduped_results
        ORDER BY relevance DESC
        LIMIT ?
      `;

      const stmt = this.db.getDb().prepare(sql);
      const results = stmt.all(
        ftsQuery,
        options.projectId,
        ftsQuery,
        options.projectId,
        ftsQuery,
        options.projectId,
        query,
        options.projectId,
        query,
        options.projectId,
        limit,
      ) as SearchResult[];

      return results;
    } catch (error) {
      throw new SearchError('Failed to execute search', error instanceof Error ? error : undefined);
    }
  }

  searchSymbols(projectId: number, query: string, limit: number = 20): SearchResult[] {
    try {
      const ftsQuery = toFtsQuery(query);
      const sql = `
        SELECT
          f.path as file,
          s.name as symbol,
          s.line as line,
          'symbol' as type,
          (-bm25(symbols_fts)) as relevance,
          snippet(symbols_fts, 0, '<b>', '</b>', '...', 64) as excerpt,
          f.language
        FROM symbols_fts
        JOIN symbols s ON symbols_fts.rowid = s.id
        JOIN files f ON s.fileId = f.id
        WHERE symbols_fts MATCH ? AND f.projectId = ?
        ORDER BY relevance DESC
        LIMIT ?
      `;
      const stmt = this.db.getDb().prepare(sql);
      return stmt.all(ftsQuery, projectId, limit) as SearchResult[];
    } catch (error) {
      throw new SearchError('Failed to search symbols', error instanceof Error ? error : undefined);
    }
  }

  searchFiles(projectId: number, query: string, limit: number = 20): SearchResult[] {
    try {
      const ftsQuery = toFtsQuery(query);
      const sql = `
        SELECT
          f.path as file,
          NULL as symbol,
          NULL as line,
          'file' as type,
          (-bm25(files_fts)) as relevance,
          snippet(files_fts, 0, '<b>', '</b>', '...', 64) as excerpt,
          f.language
        FROM files_fts
        JOIN files f ON files_fts.rowid = f.id
        WHERE files_fts MATCH ? AND f.projectId = ?
        ORDER BY relevance DESC
        LIMIT ?
      `;
      const stmt = this.db.getDb().prepare(sql);
      return stmt.all(ftsQuery, projectId, limit) as SearchResult[];
    } catch (error) {
      throw new SearchError('Failed to search files', error instanceof Error ? error : undefined);
    }
  }

  lookupSymbol(projectId: number, name: string): SymbolDetail | null {
    try {
      const sql = `
        SELECT s.*, f.path, f.relativePath, f.language
        FROM symbols s
        JOIN files f ON s.fileId = f.id
        WHERE s.name = ? AND s.projectId = ?
        LIMIT 1
      `;
      const stmt = this.db.getDb().prepare(sql);
      const row = stmt.get(name, projectId) as Record<string, unknown> | undefined;
      if (!row) return null;

      const refsSql = `
        SELECT f.path as file, r.line
        FROM references_table r
        JOIN files f ON r.fileId = f.id
        WHERE r.symbolName = ? AND r.projectId = ?
      `;
      const refs = this.db.getDb().prepare(refsSql).all(name, projectId) as Array<{
        file: string;
        line: number;
      }>;

      const importsSql = `
        SELECT f.path as file, i.source
        FROM imports i
        JOIN files f ON i.fileId = f.id
        WHERE i.projectId = ? AND (i.specifiers LIKE ? OR i.specifiers LIKE ?)
      `;
      const importNameLike = `%"${name}"%`;
      const imports = this.db
        .getDb()
        .prepare(importsSql)
        .all(projectId, importNameLike, importNameLike) as Array<{ file: string; source: string }>;

      return {
        symbol: {
          name: row['name'] as string,
          qualifiedName: row['qualifiedName'] as string,
          kind: row['kind'] as string,
          signature: row['signature'] as string | null,
          line: row['line'] as number,
          exported: Boolean(row['exported']),
        },
        file: {
          path: row['path'] as string,
          relativePath: row['relativePath'] as string,
          language: row['language'] as string,
        },
        references: refs,
        relatedImports: imports,
      };
    } catch (error) {
      throw new SearchError('Failed to lookup symbol', error instanceof Error ? error : undefined);
    }
  }

  searchDependencies(projectId: number, query: string): DependencyResult[] {
    try {
      const sql = `
        SELECT *
        FROM dependencies
        WHERE name LIKE '%' || ? || '%' AND projectId = ?
      `;
      const deps = this.db.getDb().prepare(sql).all(query, projectId) as Array<
        Record<string, unknown>
      >;

      return deps.map((dep) => {
        const importsSql = `
          SELECT f.path
          FROM imports i
          JOIN files f ON i.fileId = f.id
          WHERE i.source = ? AND i.projectId = ?
        `;
        const files = this.db
          .getDb()
          .prepare(importsSql)
          .all(dep['name'] as string, projectId) as Array<{ path: string }>;
        return {
          name: dep['name'] as string,
          version: dep['version'] as string,
          isDev: Boolean(dep['isDev']),
          isPeer: Boolean(dep['isPeer']),
          usedIn: files.map((f) => f.path),
        };
      });
    } catch (error) {
      throw new SearchError(
        'Failed to search dependencies',
        error instanceof Error ? error : undefined,
      );
    }
  }
}
