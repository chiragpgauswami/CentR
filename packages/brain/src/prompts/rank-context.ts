import type { ContextRankingInput } from '../types.js';

export function buildRankContextPrompt(input: ContextRankingInput): {
  system: string;
  user: string;
} {
  const system = `You are CentR Context Ranker. You evaluate candidate code items, symbols, memories, and learning patterns for relevance to a developer task.
CRITICAL RULES:
1. Score ONLY the candidate items listed below. NEVER invent or hallucinate new file paths, symbols, or item IDs.
2. Output strictly valid JSON matching this schema:
{
  "items": [
    {
      "id": string (MUST EXACTLY match candidate id),
      "score": number between 0.0 and 1.0,
      "reason": string (brief 1-sentence rationale)
    }
  ]
}
3. Sort items by score descending. Output strictly valid JSON with no markdown.`;

  const candidateList = input.candidates
    .map(
      (c, idx) =>
        `[Candidate ${idx + 1}] ID: "${c.id}" (${c.type}: ${c.name})\nDeterministic Score: ${c.deterministicScore}\nSnippet:\n${c.content.slice(0, 300)}`,
    )
    .join('\n\n');

  const user = `Developer Task: "${input.task}"\n\nCandidate Items to Rank:\n${candidateList}`;

  return { system, user };
}
