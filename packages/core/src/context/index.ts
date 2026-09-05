import { ContextError } from '../errors.js';
import { LearningService } from '../learning/index.js';
import { ProjectMemoryService } from '../memory/index.js';
import { SearchEngine } from '../search/index.js';
import { SkillsService } from '../skills/index.js';
import type { CentrDatabase } from '../storage/database.js';
import type { ContextItem, ContextRequest, ContextResult } from '../types.js';
import { estimateTokens, fitToBudget } from './tokens.js';

export interface BrainRankerInterface {
  rankContext(input: {
    task: string;
    candidates: Array<{
      id: string;
      type: 'file' | 'symbol' | 'memory' | 'learning' | 'skill' | 'dependency';
      name: string;
      content: string;
      deterministicScore: number;
    }>;
    maxTokens?: number;
  }): Promise<{
    items: Array<{ id: string; score: number; reason: string }>;
    reasoning?: string;
  }>;
}

export class ContextEngine {
  private search: SearchEngine;
  private memory: ProjectMemoryService;
  private learning: LearningService;
  private skills: SkillsService;
  private brain?: BrainRankerInterface;

  constructor(
    private db: CentrDatabase,
    brain?: BrainRankerInterface,
  ) {
    this.search = new SearchEngine(db);
    this.memory = new ProjectMemoryService(db);
    this.learning = new LearningService(db);
    this.skills = new SkillsService(db);
    this.brain = brain;
  }

  setBrain(brain?: BrainRankerInterface): void {
    this.brain = brain;
  }

  generate(request: ContextRequest): ContextResult {
    try {
      const maxTokens = request.maxTokens || 4000;
      const items: ContextItem[] = [];

      // 1. Extract keywords from task
      const keywords = this.extractKeywords(request.task);

      // 2. Search code (files and symbols)
      const codeResults = this.search.search({
        query: request.task,
        projectId: request.projectId,
        limit: 30,
      });
      for (const res of codeResults) {
        items.push({
          type: res.type === 'symbol' ? 'symbol' : 'file',
          name: res.symbol || res.file,
          content: res.excerpt,
          relevance: res.relevance,
          tokens: estimateTokens(res.excerpt),
          source: res.file,
          reason:
            res.type === 'symbol'
              ? `Matched task query "${request.task}" in symbol definition`
              : `Matched task query "${request.task}" in file path/content`,
          metadata: { line: res.line, language: res.language },
        });
      }

      // 3. Search project memory if enabled
      if (request.includeMemory !== false) {
        const memories = this.memory.search(request.projectId, request.task, 10);
        for (const mem of memories) {
          items.push({
            type: 'memory',
            name: mem.title,
            content: mem.content,
            relevance: 0.8,
            tokens: estimateTokens(mem.content),
            source: mem.source,
            reason: `Relevant project memory [${mem.category}]: "${mem.title}"`,
            metadata: { category: mem.category, confidence: mem.confidence },
          });
        }
      }

      // 4. Search global learning if enabled
      if (request.includeLearning !== false) {
        const lessons = this.learning.search(request.task, 5);
        for (const lesson of lessons) {
          const content =
            'Lesson: ' +
            lesson.lesson +
            '\nTrigger: ' +
            lesson.trigger +
            '\nAction: ' +
            lesson.recommendedAction;
          items.push({
            type: 'learning',
            name: 'Learning: ' + lesson.category,
            content: content,
            relevance: 0.7,
            tokens: estimateTokens(content),
            source: lesson.sourceExperience,
            reason: `Validated pattern for trigger "${lesson.trigger}" (${(lesson.confidence * 100).toFixed(0)}% confidence)`,
            metadata: { status: lesson.status, confidence: lesson.confidence },
          });
        }
      }

      // 5. Search skills if enabled
      if (request.includeSkills !== false) {
        const skillResults = this.skills.search(request.task, 3);
        for (const skill of skillResults) {
          const content =
            'Skill: ' +
            skill.name +
            '\nDescription: ' +
            skill.description +
            '\nInstructions: ' +
            skill.instructions;
          items.push({
            type: 'skill',
            name: skill.name,
            content: content,
            relevance: 0.9,
            tokens: estimateTokens(content),
            source: skill.source,
            reason: `Matching skill instructions for "${skill.name}"`,
            metadata: { category: skill.category, confidence: skill.confidence },
          });
        }
      }

      // 6. Search dependencies for relevant ones
      for (const keyword of keywords) {
        const deps = this.search.searchDependencies(request.projectId, keyword);
        for (const dep of deps) {
          const depContent =
            'Dependency: ' + dep.name + '@' + dep.version + '\nUsed in: ' + dep.usedIn.join(', ');
          items.push({
            type: 'dependency',
            name: dep.name,
            content: depContent,
            relevance: 0.5,
            tokens: estimateTokens(dep.name + dep.usedIn.join('')),
            source: 'package.json',
            reason: `Project dependency matching task keyword "${keyword}"`,
            metadata: { version: dep.version, isDev: dep.isDev, isPeer: dep.isPeer },
          });
        }
      }

      // 7. Deduplicate by name+type
      const deduped = this.deduplicate(items);

      // 8. Apply token budget
      const budgeted = fitToBudget(deduped, maxTokens);

      // 9. Build result
      return {
        items: budgeted.selected,
        estimatedTokens: budgeted.estimatedTokens,
        budget: maxTokens,
        itemsSelected: budgeted.selected.length,
        itemsRemoved: budgeted.removed.length,
        task: request.task,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new ContextError(
        'Failed to generate context',
        error instanceof Error ? error : undefined,
      );
    }
  }

  async generateWithBrain(request: ContextRequest): Promise<ContextResult> {
    const deterministicResult = this.generate(request);
    if (!this.brain || request.useBrain === false) {
      return deterministicResult;
    }

    try {
      const candidates = deterministicResult.items.map((item) => ({
        id: `${item.type}:${item.name}`,
        type: item.type,
        name: item.name,
        content: item.content,
        deterministicScore: item.relevance,
      }));

      if (candidates.length === 0) {
        return deterministicResult;
      }

      const brainRanked = await this.brain.rankContext({
        task: request.task,
        candidates,
        maxTokens: request.maxTokens,
      });

      const brainScoreMap = new Map<string, { score: number; reason: string }>();
      for (const ranked of brainRanked.items) {
        brainScoreMap.set(ranked.id, { score: ranked.score, reason: ranked.reason });
      }

      const hybridItems: ContextItem[] = deterministicResult.items.map((item) => {
        const id = `${item.type}:${item.name}`;
        const brainData = brainScoreMap.get(id);

        if (brainData) {
          const detWeight = item.relevance >= 10.0 ? 0.8 : 0.4;
          const brainWeight = 1.0 - detWeight;
          const hybridScore = item.relevance * detWeight + brainData.score * 10.0 * brainWeight;

          return {
            ...item,
            relevance: hybridScore,
            reason: `[Brain: ${(brainData.score * 100).toFixed(0)}%] ${item.reason || brainData.reason}`,
          };
        }

        return item;
      });

      const maxTokens = request.maxTokens || 4000;
      const budgeted = fitToBudget(hybridItems, maxTokens);

      return {
        items: budgeted.selected,
        estimatedTokens: budgeted.estimatedTokens,
        budget: maxTokens,
        itemsSelected: budgeted.selected.length,
        itemsRemoved: budgeted.removed.length,
        task: request.task,
        generatedAt: new Date().toISOString(),
      };
    } catch {
      // Deterministic fallback on any Brain error/timeout
      return deterministicResult;
    }
  }

  private extractKeywords(task: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'be',
    ]);
    const words = task
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/);
    return Array.from(new Set(words.filter((w) => w.length > 2 && !stopWords.has(w))));
  }

  private deduplicate(items: ContextItem[]): ContextItem[] {
    const map = new Map<string, ContextItem>();
    for (const item of items) {
      const key = item.type + ':' + item.name;
      const existing = map.get(key);
      if (!existing || existing.relevance < item.relevance) {
        map.set(key, item);
      }
    }
    return Array.from(map.values());
  }
}
