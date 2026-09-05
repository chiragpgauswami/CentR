import { describe, expect, it } from 'vitest';
import type { AgentToolEvent } from '../src/agents/types.js';
import { calculateRepeatedExploration } from '../src/metrics/repeated-exploration.js';
import type { BenchmarkRunRecord } from '../src/metrics/types.js';
import { computeBenchmarkSummary, computeScenarioStats } from '../src/reports/stats.js';

describe('Metrics & Statistics', () => {
  describe('calculateRepeatedExploration', () => {
    it('returns zero repeated explorations for normal, diverse exploration', () => {
      const events: AgentToolEvent[] = [
        { tool: 'find_by_name', target: 'src/*.ts', timestamp: 100 },
        { tool: 'view_file', target: 'src/index.ts', timestamp: 200 },
        { tool: 'view_file', target: 'src/config.ts', timestamp: 300 },
        { tool: 'replace_file_content', target: 'src/index.ts', timestamp: 400 },
      ];

      const stats = calculateRepeatedExploration(events);
      expect(stats.repeatedFileReads).toBe(0);
      expect(stats.repeatedSearches).toBe(0);
      expect(stats.totalRepeatedExplorations).toBe(0);
    });

    it('detects repeated file reads (3+ reads without edit)', () => {
      const events: AgentToolEvent[] = [
        { tool: 'view_file', target: 'src/index.ts', timestamp: 100 },
        { tool: 'view_file', target: 'src/index.ts', timestamp: 200 },
        { tool: 'view_file', target: 'src/index.ts', timestamp: 300 },
        { tool: 'view_file', target: 'src/index.ts', timestamp: 400 },
      ];

      const stats = calculateRepeatedExploration(events);
      expect(stats.repeatedFileReads).toBe(2); // 3rd and 4th reads
      expect(stats.totalRepeatedExplorations).toBe(2);
      expect(stats.details.length).toBe(2);
    });

    it('resets read counter when file is edited', () => {
      const events: AgentToolEvent[] = [
        { tool: 'view_file', target: 'src/index.ts', timestamp: 100 },
        { tool: 'view_file', target: 'src/index.ts', timestamp: 200 },
        { tool: 'replace_file_content', target: 'src/index.ts', timestamp: 300 },
        { tool: 'view_file', target: 'src/index.ts', timestamp: 400 },
        { tool: 'view_file', target: 'src/index.ts', timestamp: 500 },
      ];

      const stats = calculateRepeatedExploration(events);
      expect(stats.repeatedFileReads).toBe(0);
    });

    it('detects duplicate search queries (2+ identical queries)', () => {
      const events: AgentToolEvent[] = [
        { tool: 'grep_search', target: 'JWT_SECRET', timestamp: 100 },
        { tool: 'grep_search', target: 'JWT_SECRET', timestamp: 200 },
      ];

      const stats = calculateRepeatedExploration(events);
      expect(stats.repeatedSearches).toBe(1);
    });
  });

  describe('computeScenarioStats and computeBenchmarkSummary', () => {
    const mockRecord = (
      scenario: 'baseline' | 'centr-v1' | 'centr-v2',
      success: boolean,
      durationMs: number,
      toolCalls: number,
    ): BenchmarkRunRecord => ({
      benchmarkVersion: '1.0',
      runId: `mock-${scenario}-${Date.now()}`,
      taskId: 'task-1',
      taskTitle: 'Task 1',
      category: 'debugging',
      retrievalClass: 'class_1_exact',
      difficulty: 'easy',
      scenario,
      agent: 'generic',
      executionMode: 'automated',
      model: 'mock',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs,
      success,
      requiresManualReview: false,
      tests: { executed: true, passed: success ? 1 : 0, failed: success ? 0 : 1 },
      agentMetrics: {
        toolCalls,
        filesRead: toolCalls,
        filesModified: 1,
        filesCreated: 0,
        inputTokens: 500,
        outputTokens: 200,
        totalTokens: 700,
        repeatedExplorationCount: scenario === 'baseline' ? 2 : 0,
        patchSizeLines: 5,
      },
      centrMetrics: {
        enabled: scenario !== 'baseline',
        contextTokens: scenario !== 'baseline' ? 300 : null,
        latencyMs: scenario !== 'baseline' ? 40 : null,
        brainCalls: scenario === 'centr-v2' ? 1 : 0,
        brainLatencyMs: scenario === 'centr-v2' ? 10 : 0,
        cacheHits: 0,
        fallbacks: 0,
      },
    });

    it('computes scenario statistics accurately', () => {
      const records = [
        mockRecord('baseline', true, 1000, 8),
        mockRecord('baseline', false, 2000, 12),
      ];

      const stats = computeScenarioStats(records, 'baseline');
      expect(stats.totalRuns).toBe(2);
      expect(stats.successfulRuns).toBe(1);
      expect(stats.successRate).toBe(50);
      expect(stats.averageDurationMs).toBe(1500);
      expect(stats.averageToolCalls).toBe(10);
    });

    it('computes paired deltas across scenarios correctly', () => {
      const records = [
        mockRecord('baseline', false, 3000, 10),
        mockRecord('centr-v1', true, 1500, 4),
        mockRecord('centr-v2', true, 1200, 3),
      ];

      const summary = computeBenchmarkSummary(records);
      expect(summary.totalRecords).toBe(3);
      expect(summary.pairedDeltas.v1MinusBaseline.successRateDiff).toBe(100);
      expect(summary.pairedDeltas.v1MinusBaseline.durationMsDiff).toBe(-1500);
      expect(summary.pairedDeltas.v1MinusBaseline.toolCallsDiff).toBe(-6);
      expect(summary.pairedDeltas.v2MinusV1.durationMsDiff).toBe(-300);
    });
  });
});
