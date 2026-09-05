import type { Database } from 'better-sqlite3';

const MIGRATIONS = [
  {
    version: 1,
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          rootPath TEXT NOT NULL UNIQUE,
          language TEXT NOT NULL,
          framework TEXT,
          packageManager TEXT,
          description TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectId INTEGER NOT NULL,
          path TEXT NOT NULL,
          relativePath TEXT NOT NULL,
          language TEXT NOT NULL,
          size INTEGER NOT NULL,
          hash TEXT NOT NULL,
          lastIndexed DATETIME DEFAULT CURRENT_TIMESTAMP,
          isTest BOOLEAN DEFAULT 0,
          isEntryPoint BOOLEAN DEFAULT 0,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
          UNIQUE(projectId, path)
        );
        CREATE INDEX idx_files_project_id ON files(projectId);
        CREATE INDEX idx_files_relative_path ON files(relativePath);

        CREATE TABLE symbols (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fileId INTEGER NOT NULL,
          projectId INTEGER NOT NULL,
          name TEXT NOT NULL,
          qualifiedName TEXT NOT NULL,
          kind TEXT NOT NULL,
          signature TEXT,
          line INTEGER NOT NULL,
          endLine INTEGER,
          column INTEGER NOT NULL,
          exported BOOLEAN DEFAULT 0,
          FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_symbols_file_id ON symbols(fileId);
        CREATE INDEX idx_symbols_project_id ON symbols(projectId);

        CREATE TABLE imports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fileId INTEGER NOT NULL,
          projectId INTEGER NOT NULL,
          source TEXT NOT NULL,
          specifiers TEXT NOT NULL,
          isDefault BOOLEAN DEFAULT 0,
          isNamespace BOOLEAN DEFAULT 0,
          line INTEGER NOT NULL,
          FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_imports_file_id ON imports(fileId);

        CREATE TABLE exports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fileId INTEGER NOT NULL,
          projectId INTEGER NOT NULL,
          name TEXT NOT NULL,
          kind TEXT NOT NULL,
          isDefault BOOLEAN DEFAULT 0,
          line INTEGER NOT NULL,
          FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_exports_file_id ON exports(fileId);

        CREATE TABLE references_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fileId INTEGER NOT NULL,
          projectId INTEGER NOT NULL,
          symbolName TEXT NOT NULL,
          line INTEGER NOT NULL,
          column INTEGER NOT NULL,
          FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_references_file_id ON references_table(fileId);

        CREATE TABLE dependencies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectId INTEGER NOT NULL,
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          isDev BOOLEAN DEFAULT 0,
          isPeer BOOLEAN DEFAULT 0,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_dependencies_project_id ON dependencies(projectId);

        CREATE TABLE routes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectId INTEGER NOT NULL,
          fileId INTEGER NOT NULL,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          handler TEXT,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_routes_project_id ON routes(projectId);

        CREATE TABLE project_memory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectId INTEGER NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL,
          source TEXT NOT NULL,
          confidence REAL NOT NULL,
          tags TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_memory_project_id ON project_memory(projectId);

        CREATE TABLE learning (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lesson TEXT NOT NULL,
          category TEXT NOT NULL,
          trigger TEXT NOT NULL,
          recommendedAction TEXT NOT NULL,
          confidence REAL NOT NULL,
          scope TEXT NOT NULL,
          status TEXT NOT NULL,
          sourceExperience TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE learning_evidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          learningId INTEGER NOT NULL,
          experience TEXT NOT NULL,
          outcome TEXT NOT NULL,
          context TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (learningId) REFERENCES learning(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_learning_evidence_learning_id ON learning_evidence(learningId);

        CREATE TABLE skills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          trigger TEXT NOT NULL,
          instructions TEXT NOT NULL,
          category TEXT NOT NULL,
          confidence REAL NOT NULL,
          source TEXT NOT NULL,
          scope TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectId INTEGER NOT NULL,
          task TEXT,
          status TEXT NOT NULL,
          context TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_sessions_project_id ON sessions(projectId);

        CREATE TABLE index_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectId INTEGER NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_index_metadata_project_id ON index_metadata(projectId);

        -- FTS5 Tables
        CREATE VIRTUAL TABLE files_fts USING fts5(
          relativePath
        );

        CREATE VIRTUAL TABLE symbols_fts USING fts5(
          name,
          qualifiedName,
          signature
        );

        CREATE VIRTUAL TABLE memory_fts USING fts5(
          title,
          content,
          tags
        );

        CREATE VIRTUAL TABLE learning_fts USING fts5(
          lesson,
          trigger,
          recommendedAction
        );

        CREATE VIRTUAL TABLE skills_fts USING fts5(
          name,
          description,
          trigger,
          instructions
        );
      `);
    },
  },
];

export function runMigrations(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const currentVersionRow = db
    .prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1')
    .get() as { version: number } | undefined;
  const currentVersion = currentVersionRow?.version || 0;

  const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );

  if (pendingMigrations.length === 0) return;

  const runAll = db.transaction(() => {
    for (const migration of pendingMigrations) {
      migration.up(db);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version);
      db.pragma(`user_version = ${migration.version}`);
    }
  });

  runAll();
}
