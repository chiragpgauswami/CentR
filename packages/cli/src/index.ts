#!/usr/bin/env node
import { Command } from 'commander';
import { handleError } from './utils.js';

import benchmarkCommand from './commands/benchmark.js';
import brainCommand from './commands/brain.js';
import contextCommand from './commands/context.js';
import doctorCommand from './commands/doctor.js';
import initCommand from './commands/init.js';
import learnCommand from './commands/learn.js';
import searchCommand from './commands/search.js';
import skillsCommand from './commands/skills.js';
import statusCommand from './commands/status.js';
import symbolCommand from './commands/symbol.js';
import syncCommand from './commands/sync.js';

process.on('uncaughtException', (err) => {
  handleError(err);
});
process.on('unhandledRejection', (err) => {
  handleError(err);
});

const program = new Command();

program
  .name('centr')
  .description('Project Intelligence + Learning Middleware for AI Coding Agents')
  .version('0.1.0')
  .option('--json', 'Output in JSON format');

initCommand(program);
syncCommand(program);
statusCommand(program);
searchCommand(program);
contextCommand(program);
symbolCommand(program);
learnCommand(program);
skillsCommand(program);
doctorCommand(program);
benchmarkCommand(program);
brainCommand(program);

program.parse();
