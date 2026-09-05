import type { ScenarioContext, ScenarioPreparer } from './types.js';

export class BaselineScenario implements ScenarioPreparer {
  readonly type = 'baseline' as const;

  async prepare(_workspaceDir: string, _taskPrompt: string): Promise<ScenarioContext> {
    return {
      type: 'baseline',
      centrEnabled: false,
      brainEnabled: false,
    };
  }
}
