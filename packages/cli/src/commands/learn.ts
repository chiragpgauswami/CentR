import { LearningService } from '@centr/core';
import chalk from 'chalk';
import { Command } from 'commander';
import * as readline from 'node:readline';
import { getDatabase, getProjectRoot, handleError } from '../utils.js';

export default function (program: Command) {
  const learn = program.command('learn').description('Manage learning and lessons');

  learn
    .command('list')
    .description('List existing lessons')
    .action(async () => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const learningService = new LearningService(db);

        const lessons = db.all<{
          id: number;
          lesson: string;
          category: string;
          status: string;
          confidence: number;
        }>(
          'SELECT id, lesson, category, status, confidence FROM learning ORDER BY confidence DESC',
        );

        if (options.json) {
          console.log(JSON.stringify(lessons, null, 2));
        } else {
          if (lessons.length === 0) {
            console.log(chalk.yellow('No lessons found.'));
            return;
          }
          console.table(
            lessons.map((l) => ({
              ID: l.id,
              Lesson: l.lesson.substring(0, 50) + (l.lesson.length > 50 ? '...' : ''),
              Category: l.category,
              Status: l.status,
              Confidence: l.confidence.toFixed(2),
            })),
          );
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });

  learn
    .command('add')
    .description('Add a new lesson interactively')
    .action(async () => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const learningService = new LearningService(db);

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const question = (query: string): Promise<string> =>
          new Promise((resolve) => rl.question(query, resolve));

        console.log(chalk.bold('Add New Lesson'));
        const lesson = await question('Lesson: ');
        const category = await question('Category: ');
        const trigger = await question('Trigger (when is it relevant): ');
        const action = await question('Recommended action: ');
        const experience = await question('Source experience: ');
        rl.close();

        const created = learningService.record({
          lesson,
          category,
          trigger,
          recommendedAction: action,
          scope: 'global',
          sourceExperience: experience,
        });

        if (options.json) {
          console.log(JSON.stringify(created, null, 2));
        } else {
          console.log(chalk.green(`Lesson #${created.id} added successfully.`));
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });

  learn
    .command('promote <id>')
    .description('Promote a candidate lesson to validated')
    .action(async (idStr) => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const learningService = new LearningService(db);
        const id = parseInt(idStr, 10);

        const promoted = learningService.promote(id);
        if (!promoted) {
          console.log(
            chalk.yellow(`Could not promote lesson #${id}. Confidence may be below threshold.`),
          );
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(promoted, null, 2));
        } else {
          console.log(chalk.green(`Lesson #${id} promoted to validated.`));
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });

  learn
    .command('reject <id>')
    .description('Reject a candidate lesson')
    .action(async (idStr) => {
      const options = program.opts();
      let db;
      try {
        const root = getProjectRoot();
        db = getDatabase(root);
        const learningService = new LearningService(db);
        const id = parseInt(idStr, 10);

        const rejected = learningService.reject(id);
        if (!rejected) {
          console.log(chalk.yellow(`Could not find lesson #${id}.`));
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(rejected, null, 2));
        } else {
          console.log(chalk.green(`Lesson #${id} rejected.`));
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (db) db.close();
      }
    });

  learn.action(() => {
    console.log(chalk.yellow('Please specify a subcommand: list, add, promote, reject'));
  });
}
