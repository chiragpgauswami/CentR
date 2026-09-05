import { Command } from 'commander';
import chalk from 'chalk';
import { SearchEngine } from '@centr-ai/core';
import { getProjectRoot, getDatabase, getProjectId, handleError } from '../utils.js';

export default function(program: Command) {
  program
    .command('search <query>')
    .description('Search across project files and symbols')
    .option('-l, --limit <number>', 'Maximum number of results', '10')
    .action(async (query, cmdOptions) => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const projectId = getProjectId(db, root);
        
        const searchEngine = new SearchEngine(db);
        const results = await searchEngine.search({
          query,
          projectId,
          limit: parseInt(cmdOptions.limit, 10),
          json: options.json
        });
        
        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          if (results.length === 0) {
            console.log(chalk.yellow('No results found.'));
            return;
          }
          console.table(
            results.map((r: any) => ({
              File: r.file,
              Symbol: r.symbol || '',
              Type: r.type,
              Score: r.relevance.toFixed(2)
            }))
          );
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });
}
