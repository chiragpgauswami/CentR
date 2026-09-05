import type { LearningExtractionInput } from '../types.js';

export function buildExtractLearningPrompt(input: LearningExtractionInput): {
  system: string;
  user: string;
} {
  const system = `You are CentR Learning Synthesizer. You extract durable, generalizable software development lessons from an agent experience.
Output ONLY a valid JSON object matching this schema:
{
  "lesson": string (clear, actionable statement of the insight),
  "category": string (e.g. "authentication", "database", "configuration", "workflow", "testing", "performance"),
  "trigger": string (when this lesson applies, e.g. "when updating auth middleware"),
  "recommendedAction": string (what to do, e.g. "load env configuration before server starts"),
  "confidence": number between 0.1 and 1.0,
  "generalizable": boolean (true if applicable across projects),
  "evidence": string[] (concrete facts from the experience supporting this lesson)
}
Output strictly valid JSON with no markdown formatting.`;

  const user = `Task: ${input.task}
Attempt: ${input.attempt}
Outcome: ${input.result}
${input.error ? `Error: ${input.error}` : ''}
${input.fix ? `Fix: ${input.fix}` : ''}
${input.validation ? `Validation: ${input.validation}` : ''}`;

  return { system, user };
}
