import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { CentrDatabase, DatabaseError } from '@centr-ai/core';

export function getProjectRoot(): string {
  let current = process.cwd();
  const root = path.parse(current).root;
  while (current !== root) {
    if (
      fs.existsSync(path.join(current, '.centr')) ||
      fs.existsSync(path.join(current, 'package.json')) ||
      fs.existsSync(path.join(current, '.git'))
    ) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

export function getDatabase(root: string): CentrDatabase {
  const centrDir = path.join(root, '.centr');
  if (!fs.existsSync(centrDir)) {
    fs.mkdirSync(centrDir, { recursive: true });
  }
  const dbPath = path.join(centrDir, 'centr.db');
  const db = new CentrDatabase(dbPath);
  db.initialize();
  return db;
}

export function getProjectId(db: CentrDatabase, root: string): number {
  const row = db.getDb().prepare(`SELECT id FROM projects WHERE rootPath = ?`).get(root) as { id: number } | undefined;
  if (!row) {
    throw new Error('Project not initialized. Run "centr init" first.');
  }
  return row.id;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatDuration(ms: number): string {
  return (ms / 1000).toFixed(2) + 's';
}

export function handleError(error: unknown): never {
  if (error instanceof Error) {
    console.error(chalk.red('Error: ' + error.message));
  } else {
    console.error(chalk.red('An unknown error occurred'));
  }
  process.exit(1);
}
