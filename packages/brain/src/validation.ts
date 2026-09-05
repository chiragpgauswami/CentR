import type {
  ContextRankingOutput,
  FailureAnalysisOutput,
  LearningExtractionOutput,
  SkillSelectionOutput,
  SummarizationOutput,
  TaskClassificationOutput,
} from './types.js';
import { BrainInvalidResponseError } from './types.js';

/**
 * Extracts and parses JSON from raw LLM output.
 * Handles markdown ```json codeblocks, leading/trailing whitespace, etc.
 */
export function extractJsonFromText(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new BrainInvalidResponseError('Empty response from model');
  }

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // 2. Try stripping markdown code fences
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      try {
        return JSON.parse(fenceMatch[1]);
      } catch {
        // Continue to bracket search
      }
    }

    // 3. Try finding first { and matching last }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        // Fall through
      }
    }

    throw new BrainInvalidResponseError('Failed to parse JSON from model output');
  }
}

/**
 * Validates task classification output.
 */
export function validateTaskClassification(data: unknown): TaskClassificationOutput {
  if (typeof data !== 'object' || data === null) {
    throw new BrainInvalidResponseError('Task classification must be an object');
  }

  const d = data as Record<string, unknown>;
  const category =
    typeof d['category'] === 'string' && d['category'].trim() ? d['category'].trim() : 'other';
  const subcategories = Array.isArray(d['subcategories'])
    ? d['subcategories'].filter((s): s is string => typeof s === 'string')
    : [];
  const entities = Array.isArray(d['entities'])
    ? d['entities'].filter((e): e is string => typeof e === 'string')
    : [];
  const risk = d['risk'] === 'low' || d['risk'] === 'high' ? d['risk'] : 'medium';
  let confidence = typeof d['confidence'] === 'number' ? d['confidence'] : 0.5;
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  const suggestedDomains = Array.isArray(d['suggestedDomains'])
    ? d['suggestedDomains'].filter((dom): dom is string => typeof dom === 'string')
    : [];

  return {
    category,
    subcategories,
    entities,
    risk,
    confidence,
    suggestedDomains,
  };
}

/**
 * Validates context ranking output.
 * CRITICAL HALLUCINATION GUARD: Discards any item whose id was NOT in allowedIds.
 */
export function validateContextRanking(
  data: unknown,
  allowedIds: Set<string>,
): ContextRankingOutput {
  if (typeof data !== 'object' || data === null) {
    throw new BrainInvalidResponseError('Context ranking must be an object');
  }

  const d = data as Record<string, unknown>;
  if (!Array.isArray(d['items'])) {
    throw new BrainInvalidResponseError('Context ranking items must be an array');
  }

  const items: ContextRankingOutput['items'] = [];
  const seenIds = new Set<string>();

  for (const item of d['items']) {
    if (typeof item !== 'object' || item === null) continue;
    const it = item as Record<string, unknown>;
    const id = typeof it['id'] === 'string' ? it['id'].trim() : '';

    // Hallucination Guard: Discard unsupplied IDs!
    if (!id || !allowedIds.has(id)) {
      continue;
    }

    if (seenIds.has(id)) continue;
    seenIds.add(id);

    let score = typeof it['score'] === 'number' ? it['score'] : 0.5;
    if (score < 0) score = 0;
    if (score > 1) score = 1;

    const reason =
      typeof it['reason'] === 'string' && it['reason'].trim()
        ? it['reason'].trim()
        : 'Relevant to task';

    items.push({ id, score, reason });
  }

  // Sort ranked items by score descending
  items.sort((a, b) => b.score - a.score);

  return {
    items,
    reasoning: typeof d['reasoning'] === 'string' ? d['reasoning'] : undefined,
  };
}

/**
 * Validates learning extraction output.
 */
export function validateLearningExtraction(data: unknown): LearningExtractionOutput {
  if (typeof data !== 'object' || data === null) {
    throw new BrainInvalidResponseError('Learning extraction must be an object');
  }

  const d = data as Record<string, unknown>;
  const lesson =
    typeof d['lesson'] === 'string' && d['lesson'].trim()
      ? d['lesson'].trim()
      : 'Maintain proper configuration before initializing services';

  const category =
    typeof d['category'] === 'string' && d['category'].trim() ? d['category'].trim() : 'workflow';
  const trigger =
    typeof d['trigger'] === 'string' && d['trigger'].trim()
      ? d['trigger'].trim()
      : 'service initialization';
  const recommendedAction =
    typeof d['recommendedAction'] === 'string' && d['recommendedAction'].trim()
      ? d['recommendedAction'].trim()
      : 'Verify prerequisites before execution';

  let confidence = typeof d['confidence'] === 'number' ? d['confidence'] : 0.5;
  if (confidence < 0.1) confidence = 0.1;
  if (confidence > 1) confidence = 1;

  const generalizable = typeof d['generalizable'] === 'boolean' ? d['generalizable'] : true;
  const evidence = Array.isArray(d['evidence'])
    ? d['evidence'].filter((e): e is string => typeof e === 'string')
    : [];

  return {
    lesson,
    category,
    trigger,
    recommendedAction,
    confidence,
    generalizable,
    evidence,
  };
}

/**
 * Validates failure analysis output.
 */
export function validateFailureAnalysis(data: unknown): FailureAnalysisOutput {
  if (typeof data !== 'object' || data === null) {
    throw new BrainInvalidResponseError('Failure analysis must be an object');
  }

  const d = data as Record<string, unknown>;
  const validTypes = [
    'configuration',
    'syntax',
    'type_error',
    'logic',
    'environment',
    'permission',
    'dependency',
    'other',
  ];

  const failureType =
    typeof d['failureType'] === 'string' && validTypes.includes(d['failureType'])
      ? (d['failureType'] as FailureAnalysisOutput['failureType'])
      : 'other';

  const rootCause =
    typeof d['rootCause'] === 'string' && d['rootCause'].trim()
      ? d['rootCause'].trim()
      : 'Unspecified failure cause';

  const fixRecommendation =
    typeof d['fixRecommendation'] === 'string' && d['fixRecommendation'].trim()
      ? d['fixRecommendation'].trim()
      : 'Inspect stack trace and environment configuration';

  const generalizable = typeof d['generalizable'] === 'boolean' ? d['generalizable'] : false;
  const lessonCandidate =
    typeof d['lessonCandidate'] === 'string' && d['lessonCandidate'].trim()
      ? d['lessonCandidate'].trim()
      : undefined;

  let confidence = typeof d['confidence'] === 'number' ? d['confidence'] : 0.5;
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  return {
    failureType,
    rootCause,
    fixRecommendation,
    generalizable,
    lessonCandidate,
    confidence,
  };
}

/**
 * Validates skill selection output.
 * CRITICAL HALLUCINATION GUARD: Discards any skillId NOT in allowedSkillIds.
 */
export function validateSkillSelection(
  data: unknown,
  allowedSkillIds: Set<string>,
): SkillSelectionOutput {
  if (typeof data !== 'object' || data === null) {
    throw new BrainInvalidResponseError('Skill selection must be an object');
  }

  const d = data as Record<string, unknown>;
  const rawIds = Array.isArray(d['selectedSkillIds']) ? d['selectedSkillIds'] : [];
  const selectedSkillIds: string[] = [];

  for (const raw of rawIds) {
    if (typeof raw === 'string' && allowedSkillIds.has(raw.trim())) {
      selectedSkillIds.push(raw.trim());
    }
  }

  const reasoning: Record<string, string> = {};
  if (typeof d['reasoning'] === 'object' && d['reasoning'] !== null) {
    for (const [key, val] of Object.entries(d['reasoning'] as Record<string, unknown>)) {
      if (allowedSkillIds.has(key) && typeof val === 'string') {
        reasoning[key] = val.trim();
      }
    }
  }

  return {
    selectedSkillIds,
    reasoning,
  };
}

/**
 * Validates summarization output.
 */
export function validateSummarization(data: unknown, sourceId: string): SummarizationOutput {
  if (typeof data !== 'object' || data === null) {
    throw new BrainInvalidResponseError('Summarization must be an object');
  }

  const d = data as Record<string, unknown>;
  const summary =
    typeof d['summary'] === 'string' && d['summary'].trim()
      ? d['summary'].trim()
      : 'Summary unavailable';

  const sourceIds = Array.isArray(d['sourceIds'])
    ? Array.from(
        new Set([sourceId, ...d['sourceIds'].filter((s): s is string => typeof s === 'string')]),
      )
    : [sourceId];

  const keyPoints = Array.isArray(d['keyPoints'])
    ? d['keyPoints'].filter((k): k is string => typeof k === 'string')
    : [];

  return {
    summary,
    sourceIds,
    keyPoints,
  };
}
