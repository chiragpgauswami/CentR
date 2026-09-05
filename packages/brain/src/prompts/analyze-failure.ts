import type { FailureAnalysisInput } from '../types.js';

export function buildAnalyzeFailurePrompt(input: FailureAnalysisInput): {
  system: string;
  user: string;
} {
  const system = `You are CentR Failure Analyst. You diagnose root causes of coding errors and suggest fixes.
Output ONLY a valid JSON object matching this schema:
{
  "failureType": "configuration" | "syntax" | "type_error" | "logic" | "environment" | "permission" | "dependency" | "other",
  "rootCause": string (precise technical explanation of what caused the failure),
  "fixRecommendation": string (clear instruction on how to resolve the issue),
  "generalizable": boolean,
  "lessonCandidate": string (optional candidate lesson if generalizable),
  "confidence": number between 0.0 and 1.0
}
Output strictly valid JSON with no markdown formatting.`;

  const user = `Task: ${input.task}
Attempted Change: ${input.attemptedChange}
Error Encountered: ${input.error}
${input.testOutput ? `Test Output:\n${input.testOutput}` : ''}
${input.fixAttempted ? `Fix Attempted:\n${input.fixAttempted}` : ''}`;

  return { system, user };
}
