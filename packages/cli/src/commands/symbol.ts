import { SearchEngine } from '@centr-ai/core';
import chalk from 'chalk';
import { Command } from 'commander';
import { getDatabase, getProjectId, getProjectRoot, handleError } from '../utils.js';

export default function (program: Command) {
  program
    .command('symbol <name>')
    .description('Lookup symbol details')
    .action(async (name) => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const projectId = getProjectId(db, root);

        const searchEngine = new SearchEngine(db);
        const result = searchEngine.lookupSymbol(projectId, name);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (!result) {
            console.log(chalk.yellow(`Symbol '${name}' not found.`));
            return;
          }
          console.log(chalk.bold('Symbol Details\n'));
          console.log(`Name: ${chalk.cyan(result.symbol.name)}`);
          console.log(`Kind: ${chalk.cyan(result.symbol.kind)}`);
          if (result.file) console.log(`File: ${chalk.cyan(result.file.relativePath)}`);
          if (result.symbol.line) console.log(`Line: ${chalk.cyan(result.symbol.line)}`);
          if (result.symbol.signature)
            console.log(`Signature: ${chalk.cyan(result.symbol.signature)}`);
          if (result.references.length > 0) {
            console.log(`References: ${chalk.cyan(result.references.length)}`);
          }
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });
}
