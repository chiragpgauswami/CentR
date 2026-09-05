import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { getProjectRoot, getDatabase, getProjectId, formatNumber, handleError } from '../utils.js';

export default function(program: Command) {
  program
    .command('status')
    .description('Show project intelligence status')
    .action(async () => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const projectId = getProjectId(db, root);
        
        const project = db.getDb().prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
        const fileCount = (db.getDb().prepare('SELECT COUNT(*) as c FROM files WHERE projectId = ?').get(projectId) as any).c;
        const symbolCount = (db.getDb().prepare('SELECT COUNT(*) as c FROM symbols WHERE projectId = ?').get(projectId) as any).c;
        const depCount = (db.getDb().prepare('SELECT COUNT(*) as c FROM dependencies WHERE projectId = ?').get(projectId) as any).c;
        
        const lastSync = (db.getDb().prepare('SELECT MAX(lastIndexed) as maxSync FROM files WHERE projectId = ?').get(projectId) as any).maxSync;
        
        const dbPath = path.join(root, '.centr', 'centr.db');
        let dbSize = 0;
        if (fs.existsSync(dbPath)) {
          dbSize = fs.statSync(dbPath).size;
        }
        
        const statusData = {
          project: project.name,
          language: project.language,
          files: fileCount,
          symbols: symbolCount,
          dependencies: depCount,
          lastSync: lastSync || 'Never',
          databaseSize: dbSize
        };
        
        if (options.json) {
          console.log(JSON.stringify(statusData, null, 2));
        } else {
          console.log(chalk.bold('Project Intelligence Status'));
          console.log('');
          console.log(`Project: ${chalk.cyan(statusData.project)}`);
          console.log(`Language: ${chalk.cyan(statusData.language)}`);
          console.log(`Files indexed: ${chalk.cyan(formatNumber(statusData.files))}`);
          console.log(`Symbols indexed: ${chalk.cyan(formatNumber(statusData.symbols))}`);
          console.log(`Dependencies: ${chalk.cyan(formatNumber(statusData.dependencies))}`);
          console.log(`Last sync: ${chalk.cyan(statusData.lastSync)}`);
          console.log(`Database size: ${chalk.cyan((statusData.databaseSize / (1024 * 1024)).toFixed(2) + ' MB')}`);
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });
}
