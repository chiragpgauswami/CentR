import { ContextEngine } from '@centr/core';
import chalk from 'chalk';
import { Command } from 'commander';
import { getDatabase, getProjectId, getProjectRoot, handleError } from '../utils.js';

export default function (program: Command) {
  program
    .command('context <task>')
    .description('Generate context for a given task')
    .option('--max-tokens <number>', 'Maximum tokens for context budget')
    .option('--no-memory', 'Disable project memory inclusion')
    .option('--no-learning', 'Disable global learning inclusion')
    .option('--no-skills', 'Disable skills inclusion')
    .action(async (task, cmdOptions) => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const projectId = getProjectId(db, root);

        const contextEngine = new ContextEngine(db);

        const request = {
          task,
          projectId,
          maxTokens: cmdOptions.maxTokens ? parseInt(cmdOptions.maxTokens, 10) : undefined,
          includeMemory: cmdOptions.memory,
          includeLearning: cmdOptions.learning,
          includeSkills: cmdOptions.skills,
        };

        const result = contextEngine.generate(request);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.green('Context generated\n'));
          console.log(`Budget: ${chalk.cyan(result.budget)} tokens`);
          console.log(`Estimated: ${chalk.cyan(result.estimatedTokens)} tokens`);
          console.log(`Selected: ${chalk.cyan(result.itemsSelected)} items`);
          console.log(`Removed: ${chalk.cyan(result.itemsRemoved)} low-relevance items\n`);

          for (const item of result.items) {
            console.log(
              `[${chalk.yellow(item.type)}] ${chalk.bold(item.name)} (score: ${item.relevance.toFixed(2)}, tokens: ${item.tokens})`,
            );
          }
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });
}
