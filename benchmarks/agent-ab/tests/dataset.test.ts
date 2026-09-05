import { describe, expect, it } from 'vitest';
import {
  getAllTasks,
  getTaskById,
  getTasksByCategory,
  getTasksByClass,
  validateDataset,
  validateTask,
  type BenchmarkTask,
} from '../src/tasks/index.js';

describe('Benchmark Task Dataset', () => {
  const allTasks = getAllTasks();

  it('contains exactly 27 benchmark tasks', () => {
    expect(allTasks.length).toBe(27);
  });

  it('passes comprehensive dataset validation with zero errors', () => {
    const res = validateDataset(allTasks);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it('ensures all task IDs are unique', () => {
    const ids = allTasks.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(allTasks.length);
  });

  it('covers all 7 required task categories', () => {
    const categories = new Set(allTasks.map((t) => t.category));
    expect(categories.has('authentication')).toBe(true);
    expect(categories.has('api')).toBe(true);
    expect(categories.has('database')).toBe(true);
    expect(categories.has('debugging')).toBe(true);
    expect(categories.has('refactoring')).toBe(true);
    expect(categories.has('testing')).toBe(true);
    expect(categories.has('architecture')).toBe(true);
  });

  it('covers all 5 retrieval difficulty classes', () => {
    const classes = new Set(allTasks.map((t) => t.retrievalClass));
    expect(classes.has('class_1_exact')).toBe(true);
    expect(classes.has('class_2_vocabulary_mismatch')).toBe(true);
    expect(classes.has('class_3_architectural_context')).toBe(true);
    expect(classes.has('class_4_debugging')).toBe(true);
    expect(classes.has('class_5_learning_reuse')).toBe(true);
  });

  it('distributes tasks across easy, medium, and hard difficulty levels', () => {
    const difficulties = allTasks.map((t) => t.difficulty);
    const easyCount = difficulties.filter((d) => d === 'easy').length;
    const mediumCount = difficulties.filter((d) => d === 'medium').length;
    const hardCount = difficulties.filter((d) => d === 'hard').length;

    expect(easyCount).toBeGreaterThan(0);
    expect(mediumCount).toBeGreaterThan(0);
    expect(hardCount).toBeGreaterThan(0);
  });

  it('provides working task query helpers', () => {
    const auth001 = getTaskById('auth-001');
    expect(auth001).toBeDefined();
    expect(auth001?.title).toContain('Prevent replay attacks');

    const dbTasks = getTasksByCategory('database');
    expect(dbTasks.length).toBeGreaterThanOrEqual(4);

    const class2Tasks = getTasksByClass('class_2_vocabulary_mismatch');
    expect(class2Tasks.length).toBeGreaterThanOrEqual(4);
  });

  it('detects invalid tasks properly in validateTask', () => {
    const invalidTask = {
      id: '',
      title: '',
      prompt: '',
      difficulty: 'extreme',
    } as unknown as BenchmarkTask;

    const res = validateTask(invalidTask);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});
