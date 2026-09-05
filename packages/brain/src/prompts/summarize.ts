import type { SummarizationInput } from '../types.js';

export function buildSummarizePrompt(input: SummarizationInput): {
  system: string;
  user: string;
} {
  const maxTokens = input.maxSummaryTokens || 150;
  const system = `You are CentR Context Summarizer. Condense source code or technical documentation into a concise summary under ~${maxTokens} tokens.
CRITICAL RULES:
1. Preserve architectural facts, exported signatures, and constraints accurately. Do NOT hallucinate.
2. Output strictly valid JSON matching this schema:
{
  "summary": string (dense, technical summary preserving source truth),
  "sourceIds": string[] (MUST include the provided sourceId),
  "keyPoints": string[] (bullet points of critical facts)
}
Output strictly valid JSON with no markdown formatting.`;

  const user = `Source ID: "${input.sourceId}"
${input.purpose ? `Purpose of summary: ${input.purpose}\n` : ''}
Content to summarize:
${input.content}`;

  return { system, user };
}
