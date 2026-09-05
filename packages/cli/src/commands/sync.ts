import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { syncProject } from '@centr/core';
import { getProjectRoot, getDatabase, getProjectId, formatNumber, formatDuration, handleError } from '../utils.js';

export default function(program: Command) {
  program
    .command('sync')
    .description('Sync project index with filesystem changes')
    .action(async () => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const projectId = getProjectId(db, root);
        
        const spinner = ora('Syncing project...').start();
        if (options.json) spinner.stop();

        const result = await syncProject(projectId, root, db);
        
        if (!options.json) {
          spinner.succeed(chalk.green('Sync complete'));
          console.log('');
          console.log(`Files added: ${chalk.cyan(formatNumber(result.filesAdded))}`);
          console.log(`Files changed: ${chalk.cyan(formatNumber(result.filesChanged))}`);
          console.log(`Files deleted: ${chalk.cyan(formatNumber(result.filesDeleted))}`);
          console.log(`Files unchanged: ${chalk.cyan(formatNumber(result.filesUnchanged))}`);
          console.log(`Symbols updated: ${chalk.cyan(formatNumber(result.symbolsUpdated))}`);
          console.log('');
          console.log(`Time: ${chalk.cyan(formatDuration(result.timeTaken))}`);
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });
}
