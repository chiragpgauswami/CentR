import { BrainManager, createBrainProvider, type ResourceProfile } from '@centr/brain';
import {
  CentrDatabase,
  ContextEngine,
  initializeProject,
  loadConfig,
  saveConfig,
} from '@centr/core';
import fs from 'node:fs';
import path from 'node:path';
import type { ScenarioContext, ScenarioPreparer } from './types.js';

export class CentRV2Scenario implements ScenarioPreparer {
  readonly type = 'centr-v2' as const;

  async prepare(
    workspaceDir: string,
    taskPrompt: string,
    options?: { brainProvider?: string; brainProfile?: string },
  ): Promise<ScenarioContext> {
    const centrDir = path.join(workspaceDir, '.centr');
    if (!fs.existsSync(centrDir)) {
      fs.mkdirSync(centrDir, { recursive: true });
    }

    const dbPath = path.join(centrDir, 'centr.db');
    const db = new CentrDatabase(dbPath);
    db.initialize();

    try {
      const initResult = await initializeProject(workspaceDir, db);

      const providerName = options?.brainProvider || 'mock';
      const profile = (options?.brainProfile || 'minimal') as ResourceProfile;

      const config = loadConfig(workspaceDir);
      config.brain = {
        ...config.brain,
        enabled: true,
        provider: providerName,
        profile,
        model:
          profile === 'quality'
            ? 'qwen2.5:7b'
            : profile === 'balanced'
              ? 'llama3.2:3b'
              : 'qwen2.5:1.5b',
      };
      saveConfig(workspaceDir, config);

      const brainProvider = createBrainProvider({
        enabled: true,
        provider: providerName,
        profile,
        model: config.brain.model,
      });

      const brainManager = new BrainManager(brainProvider);
      const contextEngine = new ContextEngine(db);
      contextEngine.setBrain(brainProvider);

      const start = performance.now();
      const contextResult = await contextEngine.generateWithBrain({
        task: taskPrompt,
        projectId: initResult.project.id,
        maxTokens: 3000,
        useBrain: true,
      });
      const centrLatencyMs = performance.now() - start;

      const snapshot = brainManager.getMetrics().getSnapshot();

      return {
        type: 'centr-v2',
        centrEnabled: true,
        brainEnabled: true,
        contextResult,
        centrLatencyMs,
        centrTokens: contextResult.estimatedTokens,
        brainMetrics: {
          calls: snapshot.totalCalls,
          latencyMs: snapshot.totalLatencyMs,
          cacheHits: snapshot.cacheHits,
          fallbacks: snapshot.fallbackCount,
        },
      };
    } finally {
      db.close();
    }
  }
}
