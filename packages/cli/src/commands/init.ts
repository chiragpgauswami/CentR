import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { initializeProject } from '@centr-ai/core';
import { getProjectRoot, getDatabase, formatNumber, formatDuration, handleError } from '../utils.js';

export default function(program: Command) {
  program
    .command('init')
    .description('Initialize CentR for the current project')
    .action(async () => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        
        const spinner = ora('Initializing project...').start();
        if (options.json) spinner.stop();

        const result = await initializeProject(root, db);
        
        if (!options.json) {
          spinner.succeed(chalk.green('CentR initialized'));
          console.log('');
          console.log(`Project: ${chalk.cyan(result.project.name)}`);
          console.log(`Language: ${chalk.cyan(result.project.language)}`);
          if (result.project.framework) {
            console.log(`Framework: ${chalk.cyan(result.project.framework)}`);
          }
          console.log(`Files indexed: ${chalk.cyan(formatNumber(result.filesIndexed))}`);
          console.log(`Symbols indexed: ${chalk.cyan(formatNumber(result.symbolsIndexed))}`);
          console.log(`Dependencies: ${chalk.cyan(formatNumber(result.dependenciesCount))}`);
          console.log(`Tests detected: ${chalk.cyan(formatNumber(result.testsDetected))}`);
          console.log('');
          console.log(`Index time: ${chalk.cyan(formatDuration(result.timeTaken))}`);
          console.log('');
          console.log(chalk.green('Project intelligence is ready.'));
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
