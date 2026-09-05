export * from './baseline.js';
export * from './centr-v1.js';
export * from './centr-v2.js';
export * from './types.js';

import { BaselineScenario } from './baseline.js';
import { CentRV1Scenario } from './centr-v1.js';
import { CentRV2Scenario } from './centr-v2.js';
import type { ScenarioPreparer, ScenarioType } from './types.js';

export function getScenarioPreparer(type: ScenarioType): ScenarioPreparer {
  switch (type) {
    case 'baseline':
      return new BaselineScenario();
    case 'centr-v1':
      return new CentRV1Scenario();
    case 'centr-v2':
      return new CentRV2Scenario();
    default:
      throw new Error(`Unknown scenario type: ${type}`);
  }
}
