import {
  BrainManager,
  createBrainProvider,
  defaultBrainMetrics,
  recommendProfile,
  ResourceProfile,
} from '@centr-ai/brain';
import { loadConfig, saveConfig } from '@centr-ai/core';
import chalk from 'chalk';
import type { Command } from 'commander';
import ora from 'ora';
import { getProjectRoot, handleError } from '../utils.js';

export default function registerBrainCommands(program: Command): void {
  const brainCmd = program
    .command('brain')
    .description('Manage and inspect optional local SLM Brain');

  // 1. centr brain status
  brainCmd
    .command('status')
    .description('Check local Brain provider status and availability')
    .action(async () => {
      const options = program.opts();
      try {
        const root = getProjectRoot();
        const config = loadConfig(root);
        const brainConfig = config.brain || { enabled: false, provider: null };

        const spinner = ora('Checking Brain status...').start();
        if (options['json']) spinner.stop();

        const provider = createBrainProvider(brainConfig);
        const manager = new BrainManager(provider);
        const available = await manager.isAvailable();

        const result = {
          enabled: !!brainConfig.enabled,
          provider: brainConfig.provider || 'none',
          model: brainConfig.model || 'none',
          profile: brainConfig.profile || 'minimal',
          endpoint: brainConfig.endpoint || 'http://127.0.0.1:11434',
          status: available
            ? 'available'
            : brainConfig.enabled
              ? 'offline / unreachable'
              : 'disabled',
          available,
          fallback: 'deterministic',
        };

        if (options['json']) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        spinner.stop();
        console.log('');
        console.log(chalk.bold('CentR Brain Status'));
        console.log('');
        console.log(
          `Brain:      ${result.enabled ? chalk.green('enabled') : chalk.yellow('disabled')}`,
        );
        console.log(`Provider:   ${chalk.cyan(result.provider)}`);
        console.log(`Model:      ${chalk.cyan(result.model)}`);
        console.log(`Profile:    ${chalk.cyan(result.profile)}`);
        console.log(
          `Status:     ${available ? chalk.green('available') : chalk.red(result.status)}`,
        );
        console.log(`Fallback:   ${chalk.gray(result.fallback)}`);
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });

  // 2. centr brain recommend
  brainCmd
    .command('recommend')
    .description('Inspect hardware and recommend an optimal Brain profile and model')
    .action(async () => {
      const options = program.opts();
      try {
        const recommendation = recommendProfile();

        if (options['json']) {
          console.log(JSON.stringify(recommendation, null, 2));
          return;
        }

        const hw = recommendation.hardware;
        console.log('');
        console.log(chalk.bold('CentR Hardware & Brain Recommendation'));
        console.log('');
        console.log(chalk.bold('Detected System:'));
        console.log(`  OS:               ${hw.os} (${hw.arch})`);
        console.log(`  RAM:              ${hw.totalMemoryGb} GB`);
        if (hw.availableMemoryGb !== undefined) {
          console.log(`  Available RAM:    ${hw.availableMemoryGb} GB`);
        }
        console.log(`  CPU Cores:        ${hw.cpuCores}`);
        console.log(`  Apple Silicon:    ${hw.isAppleSilicon ? 'Yes (Metal GPU)' : 'No'}`);
        console.log('');
        console.log(chalk.bold('Recommendation:'));
        console.log(`  Recommended Profile: ${chalk.cyan(recommendation.recommendedProfile)}`);
        console.log(
          `  Suggested Models:    ${chalk.green(recommendation.recommendedModels.join(', '))}`,
        );
        console.log(`  Rationale:           ${chalk.gray(recommendation.rationale)}`);
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });

  // 3. centr brain models
  brainCmd
    .command('models')
    .description('List installed models available through the local provider')
    .action(async () => {
      const options = program.opts();
      try {
        const root = getProjectRoot();
        const config = loadConfig(root);
        const provider = createBrainProvider(config.brain);

        let models: string[] = [];
        try {
          models = await provider.listModels();
        } catch {
          models = [];
        }

        if (options['json']) {
          console.log(JSON.stringify({ models }, null, 2));
          return;
        }

        console.log('');
        console.log(chalk.bold(`Installed Models (${provider.name})`));
        console.log('');
        if (models.length === 0) {
          console.log(chalk.yellow('No local models detected or provider offline.'));
          console.log(chalk.gray('To pull a small model with Ollama, run:'));
          console.log(chalk.cyan('  ollama pull qwen2.5:1.5b'));
        } else {
          for (const m of models) {
            const isCurrent = m === config.brain?.model;
            console.log(
              `  ${isCurrent ? chalk.green('●') : '○'} ${m}${isCurrent ? chalk.gray(' (configured)') : ''}`,
            );
          }
        }
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });

  // 4. centr brain enable
  brainCmd
    .command('enable')
    .description('Enable local Brain enhancement')
    .action(() => {
      const options = program.opts();
      try {
        const root = getProjectRoot();
        const config = loadConfig(root);
        config.brain = {
          ...config.brain,
          enabled: true,
          provider: config.brain?.provider || 'ollama',
          model: config.brain?.model || 'qwen2.5:1.5b',
          profile: config.brain?.profile || 'minimal',
        };
        saveConfig(root, config);

        if (options['json']) {
          console.log(JSON.stringify({ enabled: true }, null, 2));
        } else {
          console.log(chalk.green('✔ CentR Brain enabled.'));
        }
      } catch (error) {
        handleError(error);
      }
    });

  // 5. centr brain disable
  brainCmd
    .command('disable')
    .description('Disable local Brain (falls back 100% to deterministic Core)')
    .action(() => {
      const options = program.opts();
      try {
        const root = getProjectRoot();
        const config = loadConfig(root);
        config.brain = {
          ...config.brain,
          enabled: false,
        };
        saveConfig(root, config);

        if (options['json']) {
          console.log(JSON.stringify({ enabled: false }, null, 2));
        } else {
          console.log(chalk.yellow('CentR Brain disabled. Using 100% deterministic intelligence.'));
        }
      } catch (error) {
        handleError(error);
      }
    });

  // 6. centr brain set-model <model>
  brainCmd
    .command('set-model <model>')
    .description('Set the local model name for the Brain')
    .action((model: string) => {
      const options = program.opts();
      try {
        const root = getProjectRoot();
        const config = loadConfig(root);
        config.brain = {
          ...config.brain,
          model,
        };
        saveConfig(root, config);

        if (options['json']) {
          console.log(JSON.stringify({ model }, null, 2));
        } else {
          console.log(chalk.green(`✔ Configured Brain model: ${chalk.bold(model)}`));
        }
      } catch (error) {
        handleError(error);
      }
    });

  // 7. centr brain profile <profile>
  brainCmd
    .command('profile <profile>')
    .description('Set resource profile: minimal, balanced, or quality')
    .action((profileStr: string) => {
      const options = program.opts();
      try {
        const validProfiles = ['minimal', 'balanced', 'quality'];
        if (!validProfiles.includes(profileStr)) {
          throw new Error(
            `Invalid profile: "${profileStr}". Choose minimal, balanced, or quality.`,
          );
        }
        const profile = profileStr as ResourceProfile;
        const root = getProjectRoot();
        const config = loadConfig(root);
        config.brain = {
          ...config.brain,
          profile,
        };
        saveConfig(root, config);

        if (options['json']) {
          console.log(JSON.stringify({ profile }, null, 2));
        } else {
          console.log(chalk.green(`✔ Configured Brain profile: ${chalk.bold(profile)}`));
        }
      } catch (error) {
        handleError(error);
      }
    });

  // 8. centr brain stats
  brainCmd
    .command('stats')
    .description('Display Brain observability metrics and cache statistics')
    .action(() => {
      const options = program.opts();
      try {
        const snapshot = defaultBrainMetrics.getSnapshot();

        if (options['json']) {
          console.log(JSON.stringify(snapshot, null, 2));
          return;
        }

        console.log('');
        console.log(chalk.bold('CentR Brain Observability Metrics'));
        console.log('');
        console.log(`Total Calls:       ${snapshot.totalCalls}`);
        console.log(`Successful Calls:  ${chalk.green(snapshot.successfulCalls)}`);
        console.log(
          `Failed Calls:      ${snapshot.failedCalls > 0 ? chalk.red(snapshot.failedCalls) : '0'}`,
        );
        console.log(
          `Timeouts:          ${snapshot.timeoutCount > 0 ? chalk.red(snapshot.timeoutCount) : '0'}`,
        );
        console.log(`Fallbacks:         ${snapshot.fallbackCount}`);
        console.log(`Avg Latency:       ${snapshot.averageLatencyMs}ms`);
        console.log(`Est. Input Tokens: ${snapshot.estimatedInputTokens}`);
        console.log(`Est. Output Tokens:${snapshot.estimatedOutputTokens}`);
        console.log(`Cache Hits:        ${chalk.green(snapshot.cacheHits)}`);
        console.log(`Cache Misses:      ${snapshot.cacheMisses}`);
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });

  // 9. centr brain benchmark
  brainCmd
    .command('benchmark')
    .description('Benchmark Brain inference speed and structured output accuracy')
    .action(async () => {
      const options = program.opts();
      try {
        const root = getProjectRoot();
        const config = loadConfig(root);

        const spinner = ora('Running Brain benchmark...').start();
        if (options['json']) spinner.stop();

        const provider = createBrainProvider(config.brain);
        const manager = new BrainManager(provider);

        const isReady = await manager.isAvailable();
        if (!isReady) {
          if (!options['json']) {
            spinner.fail(
              chalk.red('Brain provider is offline or disabled. Running mock benchmark.'),
            );
          }
        }

        const t0 = Date.now();
        const taskResult = await manager.classifyTask({
          task: 'Add Google OAuth authentication middleware to Express API',
        });
        const taskLatencyMs = Date.now() - t0;

        const t1 = Date.now();
        const rankResult = await manager.rankContext({
          task: 'Add Google OAuth',
          candidates: [
            {
              id: 'c1',
              type: 'file',
              name: 'src/auth/oauth.ts',
              content: 'export class OAuth {}',
              deterministicScore: 0.8,
            },
            {
              id: 'c2',
              type: 'file',
              name: 'src/payment.ts',
              content: 'export class Payment {}',
              deterministicScore: 0.3,
            },
          ],
        });
        const rankLatencyMs = Date.now() - t1;

        const results = {
          provider: provider.name,
          model: config.brain?.model || 'default',
          classificationLatencyMs: taskLatencyMs,
          rankingLatencyMs: rankLatencyMs,
          totalLatencyMs: taskLatencyMs + rankLatencyMs,
          classification: taskResult,
          ranking: rankResult,
        };

        if (options['json']) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        spinner.succeed(chalk.green('Brain benchmark complete!'));
        console.log('');
        console.log(`Classification Latency: ${chalk.cyan(taskLatencyMs + 'ms')}`);
        console.log(`Context Ranking Latency: ${chalk.cyan(rankLatencyMs + 'ms')}`);
        console.log(`Total Latency:           ${chalk.cyan(taskLatencyMs + rankLatencyMs + 'ms')}`);
        console.log(`Classified Category:     ${chalk.green(taskResult.category)}`);
        console.log(`Ranked Items Count:      ${rankResult.items.length}`);
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });

  // 10. centr brain analyze-failure
  brainCmd
    .command('analyze-failure')
    .description('Analyze a development failure and suggest root cause and remediation')
    .requiredOption('--error <error>', 'Error message encountered')
    .option('--task <task>', 'Task being performed', 'Developer task')
    .option('--attempt <attempt>', 'Attempted modification', 'Code edit')
    .action(async (cmdOpts: { error: string; task: string; attempt: string }) => {
      const options = program.opts();
      try {
        const root = getProjectRoot();
        const config = loadConfig(root);
        const provider = createBrainProvider(config.brain);
        const manager = new BrainManager(provider);

        const analysis = await manager.analyzeFailure({
          task: cmdOpts.task,
          attemptedChange: cmdOpts.attempt,
          error: cmdOpts.error,
        });

        if (options['json']) {
          console.log(JSON.stringify(analysis, null, 2));
          return;
        }

        console.log('');
        console.log(chalk.bold('CentR Brain Failure Analysis'));
        console.log('');
        console.log(`Failure Type:       ${chalk.yellow(analysis.failureType)}`);
        console.log(`Root Cause:         ${analysis.rootCause}`);
        console.log(`Fix Recommendation: ${chalk.green(analysis.fixRecommendation)}`);
        if (analysis.lessonCandidate) {
          console.log(`Candidate Lesson:   ${chalk.cyan(analysis.lessonCandidate)}`);
        }
        console.log(`Confidence:         ${(analysis.confidence * 100).toFixed(0)}%`);
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });
}
