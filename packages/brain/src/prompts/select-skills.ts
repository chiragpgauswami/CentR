import type { SkillSelectionInput } from '../types.js';

export function buildSelectSkillsPrompt(input: SkillSelectionInput): {
  system: string;
  user: string;
} {
  const system = `You are CentR Skill Selector. You identify which predefined developer skills/playbooks are relevant for a task.
CRITICAL RULES:
1. Select ONLY from the candidate skill IDs provided. NEVER invent new skill IDs.
2. Output strictly valid JSON matching this schema:
{
  "selectedSkillIds": string[] (subset of provided candidate IDs),
  "reasoning": { [skillId: string]: string (1-sentence rationale) }
}
Output strictly valid JSON with no markdown formatting.`;

  const skillList = input.candidateSkills
    .map(
      (s) =>
        `- ID: "${s.id}" | Name: "${s.name}" | Description: ${s.description}${s.trigger ? ` | Trigger: ${s.trigger}` : ''}`,
    )
    .join('\n');

  const user = `Task: "${input.task}"\n\nCandidate Skills:\n${skillList}`;

  return { system, user };
}
