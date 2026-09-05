import {
  BrainCapabilities,
  BrainInvalidResponseError,
  BrainProvider,
  BrainTimeoutError,
  BrainUnavailableError,
  ContextRankingInput,
  ContextRankingOutput,
  FailureAnalysisInput,
  FailureAnalysisOutput,
  LearningExtractionInput,
  LearningExtractionOutput,
  SkillSelectionInput,
  SkillSelectionOutput,
  SummarizationInput,
  SummarizationOutput,
  TaskClassificationInput,
  TaskClassificationOutput,
} from '../types.js';

export type MockBehavior = 'normal' | 'timeout' | 'invalid_json' | 'hallucinate' | 'offline';

export class MockBrainProvider implements BrainProvider {
  readonly name = 'mock';
  public behavior: MockBehavior = 'normal';
  public simulatedLatencyMs = 10;
  public installedModels: string[] = ['qwen2.5:1.5b', 'llama3.2:3b'];

  constructor(behavior: MockBehavior = 'normal') {
    this.behavior = behavior;
  }

  capabilities(): BrainCapabilities {
    return {
      supportedTasks: [
        'classifyTask',
        'rankContext',
        'extractLearning',
        'analyzeFailure',
        'selectSkills',
        'summarize',
      ],
      maxContextTokens: 2048,
      supportsStreaming: false,
      supportsJsonFormat: true,
    };
  }

  async isReady(): Promise<boolean> {
    return this.behavior !== 'offline';
  }

  async listModels(): Promise<string[]> {
    if (this.behavior === 'offline') {
      throw new BrainUnavailableError('Mock provider is offline');
    }
    return [...this.installedModels];
  }

  private async checkBehavior(): Promise<void> {
    if (this.simulatedLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.simulatedLatencyMs));
    }
    if (this.behavior === 'offline') {
      throw new BrainUnavailableError('Mock provider is offline');
    }
    if (this.behavior === 'timeout') {
      throw new BrainTimeoutError(5000);
    }
    if (this.behavior === 'invalid_json') {
      throw new BrainInvalidResponseError('Malformed JSON: unexpected token <');
    }
  }

  async classifyTask(input: TaskClassificationInput): Promise<TaskClassificationOutput> {
    await this.checkBehavior();
    const taskLower = input.task.toLowerCase();

    let category = 'feature';
    let risk: 'low' | 'medium' | 'high' = 'low';
    const subcategories: string[] = [];
    const entities: string[] = [];

    if (taskLower.includes('auth') || taskLower.includes('login') || taskLower.includes('oauth')) {
      category = 'authentication';
      subcategories.push('security', 'identity');
      entities.push('OAuth');
      risk = 'medium';
    } else if (
      taskLower.includes('database') ||
      taskLower.includes('sql') ||
      taskLower.includes('db')
    ) {
      category = 'database';
      subcategories.push('storage', 'schema');
      entities.push('SQL');
      risk = 'medium';
    } else if (
      taskLower.includes('fix') ||
      taskLower.includes('bug') ||
      taskLower.includes('error')
    ) {
      category = 'bugfix';
      risk = 'low';
    } else if (taskLower.includes('test')) {
      category = 'testing';
      risk = 'low';
    }

    return {
      category,
      subcategories,
      entities,
      risk,
      confidence: 0.92,
      suggestedDomains: [category],
    };
  }

  async rankContext(input: ContextRankingInput): Promise<ContextRankingOutput> {
    await this.checkBehavior();
    const taskLower = input.task.toLowerCase();

    const items: ContextRankingOutput['items'] = [];

    for (const cand of input.candidates) {
      let score = 0.5;
      const nameLower = cand.name.toLowerCase();
      const contentLower = cand.content.toLowerCase();

      // Semantic boost for task matching
      if (
        taskLower.includes('auth') &&
        (nameLower.includes('auth') || nameLower.includes('user'))
      ) {
        score = 0.95;
      } else if (
        taskLower.includes('database') &&
        (nameLower.includes('data') || nameLower.includes('db'))
      ) {
        score = 0.92;
      } else if (contentLower.includes(taskLower)) {
        score = 0.88;
      }

      items.push({
        id: cand.id,
        score,
        reason: `Semantically relevant to "${input.task}" with score ${score}`,
      });
    }

    if (this.behavior === 'hallucinate') {
      // Intentionally insert a non-existent candidate ID
      items.push({
        id: 'file:src/hallucinated/fake-file.ts',
        score: 0.99,
        reason: 'Hallucinated non-existent file',
      });
    }

    items.sort((a, b) => b.score - a.score);
    return { items, reasoning: 'Ranked based on task semantic alignment' };
  }

  async extractLearning(input: LearningExtractionInput): Promise<LearningExtractionOutput> {
    await this.checkBehavior();
    return {
      lesson: `When executing task "${input.task}", verify configuration before proceeding`,
      category: 'workflow',
      trigger: input.task.slice(0, 30),
      recommendedAction: input.fix || 'Ensure prerequisites are satisfied',
      confidence: 0.85,
      generalizable: true,
      evidence: [
        `Outcome was ${input.result}`,
        input.error
          ? `Encountered error: ${input.error}`
          : 'Task required configuration adjustment',
      ],
    };
  }

  async analyzeFailure(input: FailureAnalysisInput): Promise<FailureAnalysisOutput> {
    await this.checkBehavior();
    const errorLower = input.error.toLowerCase();

    let failureType: FailureAnalysisOutput['failureType'] = 'logic';
    if (errorLower.includes('env') || errorLower.includes('config')) {
      failureType = 'configuration';
    } else if (errorLower.includes('type') || errorLower.includes('ts(')) {
      failureType = 'type_error';
    } else if (errorLower.includes('permission') || errorLower.includes('eacces')) {
      failureType = 'permission';
    } else if (errorLower.includes('cannot find module')) {
      failureType = 'dependency';
    }

    return {
      failureType,
      rootCause: `Failure triggered by: ${input.error}`,
      fixRecommendation:
        input.fixAttempted || 'Check missing environment variables and configurations',
      generalizable: true,
      lessonCandidate: `Configuration must be set up properly for ${input.task}`,
      confidence: 0.88,
    };
  }

  async selectSkills(input: SkillSelectionInput): Promise<SkillSelectionOutput> {
    await this.checkBehavior();
    const taskLower = input.task.toLowerCase();

    const selectedSkillIds: string[] = [];
    const reasoning: Record<string, string> = {};

    for (const skill of input.candidateSkills) {
      const nameWords = skill.name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const descWords = skill.description
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const isMatch =
        taskLower.includes(skill.name.toLowerCase()) ||
        taskLower.includes(skill.description.toLowerCase()) ||
        nameWords.some((w) => taskLower.includes(w)) ||
        descWords.some((w) => taskLower.includes(w));

      if (isMatch) {
        selectedSkillIds.push(skill.id);
        reasoning[skill.id] = `Matches task requirements for ${skill.name}`;
      }
    }

    if (this.behavior === 'hallucinate') {
      selectedSkillIds.push('skill:hallucinated-skill-xyz');
      reasoning['skill:hallucinated-skill-xyz'] = 'Hallucinated skill';
    }

    return { selectedSkillIds, reasoning };
  }

  async summarize(input: SummarizationInput): Promise<SummarizationOutput> {
    await this.checkBehavior();
    return {
      summary: `Concise technical summary of ${input.sourceId} under 100 tokens.`,
      sourceIds: [input.sourceId],
      keyPoints: ['Preserved exported functions and classes', 'Grounded in source code'],
    };
  }

  async complete(prompt: string): Promise<string> {
    await this.checkBehavior();
    return `Mock completion for: ${prompt.slice(0, 30)}`;
  }

  async embed(_text: string): Promise<number[]> {
    await this.checkBehavior();
    return [0.1, 0.2, 0.3, 0.4, 0.5];
  }
}
