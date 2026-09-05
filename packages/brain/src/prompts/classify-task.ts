import type { TaskClassificationInput } from '../types.js';

export function buildClassifyTaskPrompt(input: TaskClassificationInput): {
  system: string;
  user: string;
} {
  const system = `You are CentR Task Classifier. Analyze the software engineering task description and output ONLY a valid JSON object matching this schema:
{
  "category": string (e.g. "authentication", "database", "api", "ui", "testing", "refactor", "bugfix", "devops", "other"),
  "subcategories": string[],
  "entities": string[] (e.g. key libraries, tools, protocols),
  "risk": "low" | "medium" | "high",
  "confidence": number between 0.0 and 1.0,
  "suggestedDomains": string[]
}
Output strictly valid JSON with no markdown formatting.`;

  const user = `Task: ${input.task}${input.projectContext ? `\nProject Context: ${input.projectContext}` : ''}`;

  return { system, user };
}
