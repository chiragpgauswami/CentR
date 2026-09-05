import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { getProjectRoot, getDatabase, getProjectId, handleError } from '../utils.js';

export default function(program: Command) {
  program
    .command('doctor')
    .description('Check CentR installation and project health')
    .action(async () => {
      const options = program.opts();
      let db;
      const checks: any[] = [];
      
      const addCheck = (name: string, status: 'ok' | 'warn' | 'error', message: string, fix?: string) => {
        checks.push({ name, status, message, fix });
      };

      try {
        // Node.js version
        const nodeVersion = process.version;
        const major = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
        if (major >= 20) {
          addCheck('Node.js Version', 'ok', `Found ${nodeVersion} (>= 20)`);
        } else {
          addCheck('Node.js Version', 'error', `Found ${nodeVersion}, requires >= 20`, 'Upgrade Node.js');
        }

        const root = getProjectRoot();
        const centrDir = path.join(root, '.centr');
        
        if (fs.existsSync(centrDir)) {
          addCheck('CentR Directory', 'ok', 'Found .centr directory');
          
          try {
            db = getDatabase(root);
            addCheck('SQLite Availability', 'ok', 'Database engine ready');
            
            const integrity = db.getDb().pragma('integrity_check', { simple: true });
            if (integrity === 'ok' || (Array.isArray(integrity) && integrity[0]?.integrity_check === 'ok')) {
              addCheck('Database Integrity', 'ok', 'Passed integrity check');
            } else {
              addCheck('Database Integrity', 'error', 'Failed integrity check', 'Re-run initialization or restore database');
            }
            
            const userVersion = db.getDb().pragma('user_version', { simple: true });
            addCheck('Schema Version', 'ok', `Current version: ${userVersion}`);
            
            try {
              const projectId = getProjectId(db, root);
              
              const filesCount = (db.getDb().prepare('SELECT COUNT(*) as c FROM files WHERE projectId = ?').get(projectId) as any).c;
              if (filesCount > 0) {
                addCheck('Stale Index', 'ok', `Found ${filesCount} files in index`);
              } else {
                addCheck('Stale Index', 'warn', 'Index is empty', 'Run "centr init" or "centr sync"');
              }
            } catch (e) {
              addCheck('Project Initialization', 'error', 'Project not found in database', 'Run "centr init"');
            }
          } catch (e) {
            addCheck('SQLite Availability', 'error', `Failed to connect to database: ${e}`);
          }
        } else {
          addCheck('CentR Directory', 'error', 'Not found', 'Run "centr init" to initialize the project');
        }
        
        const configPath = path.join(root, 'centr.json');
        if (fs.existsSync(configPath)) {
          try {
            JSON.parse(fs.readFileSync(configPath, 'utf8'));
            addCheck('Config Validity', 'ok', 'centr.json is valid');
          } catch (e) {
            addCheck('Config Validity', 'error', 'centr.json has syntax errors', 'Fix JSON syntax in centr.json');
          }
        } else {
          addCheck('Config Validity', 'ok', 'Using default config (no centr.json)');
        }

        if (options.json) {
          console.log(JSON.stringify(checks, null, 2));
        } else {
          console.log(chalk.bold('CentR Doctor\n'));
          
          let hasErrors = false;
          for (const check of checks) {
            let icon = ' ';
            if (check.status === 'ok') icon = chalk.green('✓');
            else if (check.status === 'warn') icon = chalk.yellow('⚠');
            else if (check.status === 'error') { icon = chalk.red('✗'); hasErrors = true; }
            
            console.log(`${icon} ${chalk.bold(check.name)}: ${check.message}`);
            if (check.fix) {
              console.log(`    ${chalk.dim('Fix: ' + check.fix)}`);
            }
          }
          
          console.log('');
          if (hasErrors) {
            console.log(chalk.red('Doctor found issues that need to be resolved.'));
            process.exitCode = 1;
          } else {
            console.log(chalk.green('Everything looks good!'));
          }
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });
}
