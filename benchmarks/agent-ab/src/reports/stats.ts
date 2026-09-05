import type { BenchmarkRunRecord } from '../metrics/types.js';
import type { ScenarioType } from '../scenarios/types.js';

export interface ScenarioStats {
  scenario: ScenarioType;
  totalRuns: number;
  successfulRuns: number;
  successRate: number;
  averageDurationMs: number;
  averageToolCalls: number | null;
  averageFilesRead: number | null;
  averageTotalTokens: number | null;
  averageRepeatedExplorations: number | null;
  averageCentrLatencyMs: number | null;
  averageCentrTokens: number | null;
  totalBrainCalls: number;
  totalBrainFallbacks: number;
  totalBrainCacheHits: number;
}

export interface BenchmarkAggregateSummary {
  totalRecords: number;
  scenarios: Record<ScenarioType, ScenarioStats>;
  pairedDeltas: {
    v1MinusBaseline: {
      successRateDiff: number;
      durationMsDiff: number;
      toolCallsDiff: number;
      repeatedExplorationDiff: number;
    };
    v2MinusBaseline: {
      successRateDiff: number;
      durationMsDiff: number;
      toolCallsDiff: number;
      repeatedExplorationDiff: number;
    };
    v2MinusV1: {
      successRateDiff: number;
      durationMsDiff: number;
      toolCallsDiff: number;
      repeatedExplorationDiff: number;
    };
  };
}

export function computeScenarioStats(
  records: BenchmarkRunRecord[],
  scenario: ScenarioType,
): ScenarioStats {
  const filtered = records.filter((r) => r.scenario === scenario);
  const total = filtered.length;

  if (total === 0) {
    return {
      scenario,
      totalRuns: 0,
      successfulRuns: 0,
      successRate: 0,
      averageDurationMs: 0,
      averageToolCalls: null,
      averageFilesRead: null,
      averageTotalTokens: null,
      averageRepeatedExplorations: null,
      averageCentrLatencyMs: null,
      averageCentrTokens: null,
      totalBrainCalls: 0,
      totalBrainFallbacks: 0,
      totalBrainCacheHits: 0,
    };
  }

  const successes = filtered.filter((r) => r.success).length;
  const durationSum = filtered.reduce((acc, r) => acc + r.durationMs, 0);

  const toolCallsWithVals = filtered.filter((r) => r.agentMetrics.toolCalls !== null);
  const avgToolCalls =
    toolCallsWithVals.length > 0
      ? Math.round(
          (toolCallsWithVals.reduce((acc, r) => acc + (r.agentMetrics.toolCalls ?? 0), 0) /
            toolCallsWithVals.length) *
            10,
        ) / 10
      : null;

  const filesReadWithVals = filtered.filter((r) => r.agentMetrics.filesRead !== null);
  const avgFilesRead =
    filesReadWithVals.length > 0
      ? Math.round(
          (filesReadWithVals.reduce((acc, r) => acc + (r.agentMetrics.filesRead ?? 0), 0) /
            filesReadWithVals.length) *
            10,
        ) / 10
      : null;

  const repeatedWithVals = filtered.filter((r) => r.agentMetrics.repeatedExplorationCount !== null);
  const avgRepeated =
    repeatedWithVals.length > 0
      ? Math.round(
          (repeatedWithVals.reduce(
            (acc, r) => acc + (r.agentMetrics.repeatedExplorationCount ?? 0),
            0,
          ) /
            repeatedWithVals.length) *
            10,
        ) / 10
      : null;

  const tokensWithValues = filtered.filter((r) => r.agentMetrics.totalTokens !== null);
  const avgTokens =
    tokensWithValues.length > 0
      ? tokensWithValues.reduce((acc, r) => acc + (r.agentMetrics.totalTokens || 0), 0) /
        tokensWithValues.length
      : null;

  const centrLatencyWithVals = filtered.filter((r) => r.centrMetrics.latencyMs !== null);
  const avgCentrLatency =
    centrLatencyWithVals.length > 0
      ? centrLatencyWithVals.reduce((acc, r) => acc + (r.centrMetrics.latencyMs || 0), 0) /
        centrLatencyWithVals.length
      : null;

  const centrTokensWithVals = filtered.filter((r) => r.centrMetrics.contextTokens !== null);
  const avgCentrTokens =
    centrTokensWithVals.length > 0
      ? centrTokensWithVals.reduce((acc, r) => acc + (r.centrMetrics.contextTokens || 0), 0) /
        centrTokensWithVals.length
      : null;

  const brainCalls = filtered.reduce((acc, r) => acc + r.centrMetrics.brainCalls, 0);
  const brainFallbacks = filtered.reduce((acc, r) => acc + r.centrMetrics.fallbacks, 0);
  const brainCacheHits = filtered.reduce((acc, r) => acc + r.centrMetrics.cacheHits, 0);

  return {
    scenario,
    totalRuns: total,
    successfulRuns: successes,
    successRate: Math.round((successes / total) * 100),
    averageDurationMs: Math.round(durationSum / total),
    averageToolCalls: avgToolCalls,
    averageFilesRead: avgFilesRead,
    averageTotalTokens: avgTokens !== null ? Math.round(avgTokens) : null,
    averageRepeatedExplorations: avgRepeated,
    averageCentrLatencyMs: avgCentrLatency !== null ? Math.round(avgCentrLatency * 10) / 10 : null,
    averageCentrTokens: avgCentrTokens !== null ? Math.round(avgCentrTokens) : null,
    totalBrainCalls: brainCalls,
    totalBrainFallbacks: brainFallbacks,
    totalBrainCacheHits: brainCacheHits,
  };
}

export function computeBenchmarkSummary(records: BenchmarkRunRecord[]): BenchmarkAggregateSummary {
  const base = computeScenarioStats(records, 'baseline');
  const v1 = computeScenarioStats(records, 'centr-v1');
  const v2 = computeScenarioStats(records, 'centr-v2');

  return {
    totalRecords: records.length,
    scenarios: {
      baseline: base,
      'centr-v1': v1,
      'centr-v2': v2,
    },
    pairedDeltas: {
      v1MinusBaseline: {
        successRateDiff: v1.successRate - base.successRate,
        durationMsDiff: v1.averageDurationMs - base.averageDurationMs,
        toolCallsDiff:
          v1.averageToolCalls !== null && base.averageToolCalls !== null
            ? Math.round((v1.averageToolCalls - base.averageToolCalls) * 10) / 10
            : 0,
        repeatedExplorationDiff:
          v1.averageRepeatedExplorations !== null && base.averageRepeatedExplorations !== null
            ? Math.round((v1.averageRepeatedExplorations - base.averageRepeatedExplorations) * 10) /
              10
            : 0,
      },
      v2MinusBaseline: {
        successRateDiff: v2.successRate - base.successRate,
        durationMsDiff: v2.averageDurationMs - base.averageDurationMs,
        toolCallsDiff:
          v2.averageToolCalls !== null && base.averageToolCalls !== null
            ? Math.round((v2.averageToolCalls - base.averageToolCalls) * 10) / 10
            : 0,
        repeatedExplorationDiff:
          v2.averageRepeatedExplorations !== null && base.averageRepeatedExplorations !== null
            ? Math.round((v2.averageRepeatedExplorations - base.averageRepeatedExplorations) * 10) /
              10
            : 0,
      },
      v2MinusV1: {
        successRateDiff: v2.successRate - v1.successRate,
        durationMsDiff: v2.averageDurationMs - v1.averageDurationMs,
        toolCallsDiff:
          v2.averageToolCalls !== null && v1.averageToolCalls !== null
            ? Math.round((v2.averageToolCalls - v1.averageToolCalls) * 10) / 10
            : 0,
        repeatedExplorationDiff:
          v2.averageRepeatedExplorations !== null && v1.averageRepeatedExplorations !== null
            ? Math.round((v2.averageRepeatedExplorations - v1.averageRepeatedExplorations) * 10) /
              10
            : 0,
      },
    },
  };
}
