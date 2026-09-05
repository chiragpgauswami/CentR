export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
}

export function validate<T extends Record<string, unknown>>(
  data: T,
  rules: ValidationRule[],
): string[] {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = data[rule.field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(rule.message || `${rule.field} is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(rule.message || `${rule.field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(rule.message || `${rule.field} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(rule.message || `${rule.field} has invalid format`);
      }
    }
  }

  return errors;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;

export const CONSTANTS = {
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  SESSION_DURATION_MS: 24 * 60 * 60 * 1000,
  API_VERSION: 'v1',
} as const;
