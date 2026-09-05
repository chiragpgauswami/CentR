// Deterministic token estimation
// Uses the approximation: 1 token ≈ 4 characters (for English text/code)

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function fitToBudget<T extends { content: string; relevance: number }>(
  items: T[], 
  maxTokens: number
): {
  selected: T[];
  removed: T[];
  estimatedTokens: number;
} {
  const sortedItems = [...items].sort((a, b) => b.relevance - a.relevance);
  const selected: T[] = [];
  const removed: T[] = [];
  let currentTokens = 0;

  for (const item of sortedItems) {
    const tokens = estimateTokens(item.content);
    if (currentTokens + tokens <= maxTokens) {
      selected.push(item);
      currentTokens += tokens;
    } else {
      removed.push(item);
    }
  }

  return { selected, removed, estimatedTokens: currentTokens };
}
