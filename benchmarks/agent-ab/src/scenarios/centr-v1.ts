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

export class CentRV1Scenario implements ScenarioPreparer {
  readonly type = 'centr-v1' as const;

  async prepare(workspaceDir: string, taskPrompt: string): Promise<ScenarioContext> {
    const centrDir = path.join(workspaceDir, '.centr');
    if (!fs.existsSync(centrDir)) {
      fs.mkdirSync(centrDir, { recursive: true });
    }

    const dbPath = path.join(centrDir, 'centr.db');
    const db = new CentrDatabase(dbPath);
    db.initialize();

    try {
      const initResult = await initializeProject(workspaceDir, db);

      // Explicitly disable Brain for pure V1 deterministic behavior
      const config = loadConfig(workspaceDir);
      config.brain = {
        ...config.brain,
        enabled: false,
        provider: null,
      };
      saveConfig(workspaceDir, config);

      const contextEngine = new ContextEngine(db);

      const start = performance.now();
      const contextResult = contextEngine.generate({
        task: taskPrompt,
        projectId: initResult.project.id,
        maxTokens: 3000,
        useBrain: false,
      });
      const centrLatencyMs = performance.now() - start;

      return {
        type: 'centr-v1',
        centrEnabled: true,
        brainEnabled: false,
        contextResult,
        centrLatencyMs,
        centrTokens: contextResult.estimatedTokens,
      };
    } finally {
      db.close();
    }
  }
}
