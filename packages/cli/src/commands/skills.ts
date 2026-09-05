import { SkillsService } from '@centr-ai/core';
import chalk from 'chalk';
import { Command } from 'commander';
import * as readline from 'node:readline';
import { getDatabase, getProjectRoot, handleError } from '../utils.js';

export default function (program: Command) {
  const skills = program.command('skills').description('Manage agent skills');

  skills
    .command('list')
    .description('List available skills')
    .action(async () => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const skillsService = new SkillsService(db);

        const skillList = skillsService.getAll();

        if (options.json) {
          console.log(JSON.stringify(skillList, null, 2));
        } else {
          if (skillList.length === 0) {
            console.log(chalk.yellow('No skills found.'));
            return;
          }
          console.table(
            skillList.map((s) => ({
              ID: s.id,
              Name: s.name,
              Category: s.category,
              Confidence: s.confidence.toFixed(2),
            })),
          );
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });

  skills
    .command('add')
    .description('Add a new skill interactively')
    .action(async () => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const skillsService = new SkillsService(db);

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const question = (query: string): Promise<string> =>
          new Promise((resolve) => rl.question(query, resolve));

        console.log(chalk.bold('Add New Skill'));
        const name = await question('Name: ');
        const description = await question('Description: ');
        const trigger = await question('Trigger (regex/keywords): ');
        const instructions = await question('Instructions: ');
        const category = await question('Category: ');
        rl.close();

        const skill = skillsService.record({
          name,
          description,
          trigger,
          instructions,
          category,
          source: 'cli',
        });

        if (options.json) {
          console.log(JSON.stringify(skill, null, 2));
        } else {
          console.log(chalk.green(`Skill '${skill.name}' added successfully.`));
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });

  skills
    .command('search <query>')
    .description('Search skills')
    .action(async (query) => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const skillsService = new SkillsService(db);

        const searchResults = skillsService.search(query);

        if (options.json) {
          console.log(JSON.stringify(searchResults, null, 2));
        } else {
          if (searchResults.length === 0) {
            console.log(chalk.yellow('No skills found matching query.'));
            return;
          }
          console.table(
            searchResults.map((s) => ({
              ID: s.id,
              Name: s.name,
              Category: s.category,
              Confidence: s.confidence.toFixed(2),
            })),
          );
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });

  skills.action(() => {
    console.log(chalk.yellow('Please specify a subcommand: list, add, search'));
  });
}
