export interface BrainMetricsSnapshot {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  timeoutCount: number;
  fallbackCount: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  cacheHits: number;
  cacheMisses: number;
}

export class BrainMetricsCollector {
  private totalCalls = 0;
  private successfulCalls = 0;
  private failedCalls = 0;
  private timeoutCount = 0;
  private fallbackCount = 0;
  private totalLatencyMs = 0;
  private estimatedInputTokens = 0;
  private estimatedOutputTokens = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  recordCall(inputTokens = 0): void {
    this.totalCalls++;
    this.estimatedInputTokens += inputTokens;
  }

  recordSuccess(latencyMs: number, outputTokens = 0): void {
    this.successfulCalls++;
    this.totalLatencyMs += latencyMs;
    this.estimatedOutputTokens += outputTokens;
  }

  recordFailure(latencyMs = 0): void {
    this.failedCalls++;
    this.totalLatencyMs += latencyMs;
  }

  recordTimeout(): void {
    this.timeoutCount++;
    this.failedCalls++;
  }

  recordFallback(): void {
    this.fallbackCount++;
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  getSnapshot(): BrainMetricsSnapshot {
    return {
      totalCalls: this.totalCalls,
      successfulCalls: this.successfulCalls,
      failedCalls: this.failedCalls,
      timeoutCount: this.timeoutCount,
      fallbackCount: this.fallbackCount,
      totalLatencyMs: this.totalLatencyMs,
      averageLatencyMs: this.totalCalls > 0 ? Math.round(this.totalLatencyMs / this.totalCalls) : 0,
      estimatedInputTokens: this.estimatedInputTokens,
      estimatedOutputTokens: this.estimatedOutputTokens,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
    };
  }

  reset(): void {
    this.totalCalls = 0;
    this.successfulCalls = 0;
    this.failedCalls = 0;
    this.timeoutCount = 0;
    this.fallbackCount = 0;
    this.totalLatencyMs = 0;
    this.estimatedInputTokens = 0;
    this.estimatedOutputTokens = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

export const defaultBrainMetrics = new BrainMetricsCollector();
