import { BENCHMARK_TASKS } from './dataset.js';
import type { BenchmarkTask, RetrievalClass, TaskCategory } from './types.js';

export function getAllTasks(): BenchmarkTask[] {
  return [...BENCHMARK_TASKS];
}

export function getTaskById(id: string): BenchmarkTask | undefined {
  return BENCHMARK_TASKS.find((t) => t.id === id);
}

export function getTasksByCategory(category: TaskCategory): BenchmarkTask[] {
  return BENCHMARK_TASKS.filter((t) => t.category === category);
}

export function getTasksByClass(retrievalClass: RetrievalClass): BenchmarkTask[] {
  return BENCHMARK_TASKS.filter((t) => t.retrievalClass === retrievalClass);
}

export function validateTask(task: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!task || typeof task !== 'object') {
    return { valid: false, errors: ['Task must be a non-null object'] };
  }

  const t = task as Record<string, unknown>;
  if (typeof t['id'] !== 'string' || !t['id'].trim()) {
    errors.push('Task id must be a non-empty string');
  }
  if (typeof t['title'] !== 'string' || !t['title'].trim()) {
    errors.push('Task title must be a non-empty string');
  }
  if (typeof t['prompt'] !== 'string' || !t['prompt'].trim()) {
    errors.push('Task prompt must be a non-empty string');
  }
  if (!['easy', 'medium', 'hard'].includes(t['difficulty'] as string)) {
    errors.push(`Invalid difficulty: ${t['difficulty']}`);
  }
  if (!Array.isArray(t['expectedBehavior']) || t['expectedBehavior'].length === 0) {
    errors.push('Task must define at least one expectedBehavior');
  }
  if (!Array.isArray(t['relevantFiles']) || t['relevantFiles'].length === 0) {
    errors.push('Task must define relevantFiles');
  }
  if (!t['validation'] || typeof t['validation'] !== 'object') {
    errors.push('Task must define a validation configuration');
  }

  return { valid: errors.length === 0, errors };
}

export function validateDataset(tasks: BenchmarkTask[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const task of tasks) {
    if (seenIds.has(task.id)) {
      errors.push(`Duplicate task ID found: ${task.id}`);
    }
    seenIds.add(task.id);

    const check = validateTask(task);
    if (!check.valid) {
      errors.push(...check.errors.map((e) => `[${task.id}] ${e}`));
    }
  }

  return { valid: errors.length === 0, errors };
}
