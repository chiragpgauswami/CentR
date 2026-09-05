import { describe, it, expect } from 'vitest';
import { validate, EMAIL_PATTERN, CONSTANTS } from '../src/utils/validation.js';

describe('validate', () => {
  it('should return no errors for valid data', () => {
    const rules = [{ field: 'name', required: true }];
    const errors = validate({ name: 'John' }, rules);
    expect(errors).toEqual([]);
  });

  it('should return error for missing required field', () => {
    const rules = [{ field: 'name', required: true }];
    const errors = validate({}, rules);
    expect(errors).toHaveLength(1);
  });

  it('should validate minimum length', () => {
    const rules = [{ field: 'password', minLength: 8 }];
    const errors = validate({ password: 'short' }, rules);
    expect(errors).toHaveLength(1);
  });

  it('should validate email pattern', () => {
    expect(EMAIL_PATTERN.test('user@example.com')).toBe(true);
    expect(EMAIL_PATTERN.test('invalid')).toBe(false);
  });
});

describe('constants', () => {
  it('should have expected values', () => {
    expect(CONSTANTS.API_VERSION).toBe('v1');
    expect(CONSTANTS.MAX_NAME_LENGTH).toBe(100);
  });
});
