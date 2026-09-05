export class CentrError extends Error {
  public readonly code: string;
  public readonly cause?: Error;

  constructor(message: string, code: string = 'CENTR_ERROR', cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.cause = cause;
  }
}

export class DatabaseError extends CentrError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_ERROR', cause);
  }
}

export class IndexError extends CentrError {
  constructor(message: string, cause?: Error) {
    super(message, 'INDEX_ERROR', cause);
  }
}

export class SearchError extends CentrError {
  constructor(message: string, cause?: Error) {
    super(message, 'SEARCH_ERROR', cause);
  }
}

export class SecurityError extends CentrError {
  constructor(message: string, cause?: Error) {
    super(message, 'SECURITY_ERROR', cause);
  }
}

export class ConfigError extends CentrError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', cause);
  }
}

export class ValidationError extends CentrError {
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', cause);
  }
}

export class ContextError extends CentrError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONTEXT_ERROR', cause);
  }
}

export class MemoryError extends CentrError {
  constructor(message: string, cause?: Error) {
    super(message, 'MEMORY_ERROR', cause);
  }
}

export class LearningError extends CentrError {
  constructor(message: string, cause?: Error) {
    super(message, 'LEARNING_ERROR', cause);
  }
}
