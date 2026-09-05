import type { BenchmarkTask } from './types.js';

export const BENCHMARK_TASKS: BenchmarkTask[] = [
  // 1. Authentication / Security (4 tasks)
  {
    id: 'auth-001',
    category: 'authentication',
    retrievalClass: 'class_2_vocabulary_mismatch',
    title: 'Prevent replay attacks and token spoofing on protected routes',
    difficulty: 'medium',
    prompt:
      'Prevent replay attacks and token spoofing on protected routes by enforcing signature verification and expiration checks in auth middleware.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Token verification checks signature and expiration',
      'Replay attacks prevented via timestamp/expiry bounds',
      'Protected endpoints reject unauthenticated or tampered requests with 401',
    ],
    relevantFiles: ['src/services/auth.service.ts', 'src/middleware/error-handler.ts'],
    relevantSymbols: ['AuthService', 'verifyToken'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/services/auth.service.ts'],
      requiredStrings: [{ file: 'src/services/auth.service.ts', pattern: 'verifyToken' }],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'auth-002',
    category: 'authentication',
    retrievalClass: 'class_1_exact',
    title: 'Update UserController to validate password complexity before registration',
    difficulty: 'easy',
    prompt:
      'Update UserController to validate password complexity (min 8 chars, 1 number, 1 special char) before registering a user.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'UserController inspects password length and character classes',
      'Returns 400 Bad Request if password does not satisfy criteria',
    ],
    relevantFiles: ['src/controllers/user.controller.ts', 'src/utils/validation.ts'],
    relevantSymbols: ['UserController', 'isValidPassword'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/controllers/user.controller.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'auth-003',
    category: 'authentication',
    retrievalClass: 'class_3_architectural_context',
    title: 'Implement token revocation blacklist respecting memory architecture constraints',
    difficulty: 'medium',
    prompt:
      'Implement token revocation blacklist respecting in-memory caching and persistence constraints defined in project memory.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Revoked token IDs are stored in memory cache with TTL',
      'Revoked tokens rejected on subsequent calls',
    ],
    relevantFiles: ['src/services/auth.service.ts', 'src/services/database.service.ts'],
    relevantSymbols: ['AuthService', 'revokeToken'],
    relevantMemoryKeys: ['auth-session-decision'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/services/auth.service.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'auth-004',
    category: 'security',
    retrievalClass: 'class_5_learning_reuse',
    title: 'Apply validated JWT clock skew leeway pattern to session refresh',
    difficulty: 'hard',
    prompt:
      'Apply validated learning pattern for JWT clock skew leeway tolerance to prevent false expiration failures during session refresh.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Token refresh tolerates clock skew up to 60 seconds',
      'Applies validated security pattern from global learning',
    ],
    relevantFiles: ['src/services/auth.service.ts'],
    relevantSymbols: ['AuthService'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/services/auth.service.ts'],
    },
    metrics: { primary: 'task_success' },
  },

  // 2. API Changes (4 tasks)
  {
    id: 'api-001',
    category: 'api',
    retrievalClass: 'class_1_exact',
    title: 'Add pagination query parameters to UserController.listUsers',
    difficulty: 'easy',
    prompt:
      'Add pagination query parameters (limit and offset with sensible defaults) to UserController.listUsers endpoint.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'UserController accepts limit and offset query params',
      'Defaults limit to 20, offset to 0',
      'Returns paginated user list with total count metadata',
    ],
    relevantFiles: ['src/controllers/user.controller.ts'],
    relevantSymbols: ['UserController'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/controllers/user.controller.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'api-002',
    category: 'api',
    retrievalClass: 'class_2_vocabulary_mismatch',
    title: 'Implement idempotency safeguards for state-mutating resource creation endpoints',
    difficulty: 'medium',
    prompt:
      'Implement idempotency safeguards for POST endpoints using Idempotency-Key headers to prevent duplicate records.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Idempotency-Key header is checked for duplicate submission',
      'Returns cached response on repeated request with identical key',
    ],
    relevantFiles: ['src/middleware/error-handler.ts', 'src/controllers/user.controller.ts'],
    relevantSymbols: ['errorHandler'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/controllers/user.controller.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'api-003',
    category: 'api',
    retrievalClass: 'class_3_architectural_context',
    title: 'Expose healthcheck endpoint following project error handling conventions',
    difficulty: 'medium',
    prompt:
      'Expose /health endpoint reporting database connectivity and uptime following project error handling conventions.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'GET /health returns 200 with status ok and DB check',
      'Catches and formats DB error using standard error structure',
    ],
    relevantFiles: ['src/index.ts', 'src/services/database.service.ts'],
    relevantSymbols: ['DatabaseService'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/index.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'api-004',
    category: 'api',
    retrievalClass: 'class_5_learning_reuse',
    title: 'Implement standardized RFC 7807 problem details error response format',
    difficulty: 'hard',
    prompt:
      'Implement standardized RFC 7807 Problem Details error response format across all API error handlers using validated learning.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Errors return application/problem+json with type, title, status, detail, instance',
      'Consistent error responses across controllers',
    ],
    relevantFiles: ['src/middleware/error-handler.ts'],
    relevantSymbols: ['errorHandler'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/middleware/error-handler.ts'],
    },
    metrics: { primary: 'task_success' },
  },

  // 3. Database (4 tasks)
  {
    id: 'database-001',
    category: 'database',
    retrievalClass: 'class_3_architectural_context',
    title: 'Optimize user lookup query while preserving connection pool limits',
    difficulty: 'medium',
    prompt:
      'Optimize user query latency in DatabaseService while strictly adhering to maximum connection pool size of 10.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'User lookup queries reuse pooled connections without exceeding max 10',
      'Prepared statements used for execution',
    ],
    relevantFiles: ['src/services/database.service.ts', 'src/types/config.ts'],
    relevantSymbols: ['DatabaseService'],
    relevantMemoryKeys: ['db-connection-pool-constraint'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/services/database.service.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'database-002',
    category: 'database',
    retrievalClass: 'class_1_exact',
    title: 'Add index to users table for email column in DatabaseService',
    difficulty: 'easy',
    prompt:
      'Add CREATE INDEX IF NOT EXISTS idx_users_email on users(email) in DatabaseService initialization migration.',
    repositoryFixture: 'sample-project',
    expectedBehavior: ['Index created on users.email', 'Migration runs idempotently on startup'],
    relevantFiles: ['src/services/database.service.ts'],
    relevantSymbols: ['DatabaseService'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/services/database.service.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'database-003',
    category: 'database',
    retrievalClass: 'class_2_vocabulary_mismatch',
    title: 'Prevent stale reads during concurrent balance transfers',
    difficulty: 'medium',
    prompt:
      'Prevent stale reads and race conditions during concurrent user operations by enforcing serializable transaction isolation.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Database operations wrapped in explicit BEGIN IMMEDIATE / EXCLUSIVE transactions',
      'Rollback on failure',
    ],
    relevantFiles: ['src/services/database.service.ts'],
    relevantSymbols: ['DatabaseService'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/services/database.service.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'database-004',
    category: 'database',
    retrievalClass: 'class_4_debugging',
    title: 'Fix unhandled SQLite busy lock exception during high-concurrency writes',
    difficulty: 'hard',
    prompt:
      'Fix unhandled SQLite SQLITE_BUSY error by configuring WAL journal mode and busy_timeout handler.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Database connection sets PRAGMA journal_mode = WAL',
      'Database connection sets PRAGMA busy_timeout = 5000',
    ],
    relevantFiles: ['src/services/database.service.ts'],
    relevantSymbols: ['DatabaseService'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/services/database.service.ts'],
    },
    metrics: { primary: 'task_success' },
  },

  // 4. Debugging (5 tasks)
  {
    id: 'debugging-001',
    category: 'debugging',
    retrievalClass: 'class_4_debugging',
    title: 'Fix ECONNREFUSED in database connection startup due to missing environment variable',
    difficulty: 'easy',
    prompt:
      'Fix ECONNREFUSED when starting the service: verify environment variable loading and fallback to default localhost port.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Reads DATABASE_URL or defaults cleanly to local SQLite',
      'Avoids throwing unhandled ECONNREFUSED',
    ],
    relevantFiles: ['src/services/database.service.ts', 'src/types/config.ts'],
    relevantSymbols: ['DatabaseService'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/services/database.service.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'debugging-002',
    category: 'debugging',
    retrievalClass: 'class_4_debugging',
    title: 'Fix null pointer dereference in UserController when requesting non-existent user ID',
    difficulty: 'medium',
    prompt:
      'Fix TypeError: Cannot read properties of undefined in UserController.getUserById when ID does not exist; return 404 cleanly.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Checks if user exists before reading properties',
      'Returns 404 with error message instead of crashing',
    ],
    relevantFiles: ['src/controllers/user.controller.ts'],
    relevantSymbols: ['UserController'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/controllers/user.controller.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'debugging-003',
    category: 'debugging',
    retrievalClass: 'class_4_debugging',
    title: 'Fix silent uncaught promise rejection in async error handler middleware',
    difficulty: 'medium',
    prompt:
      'Fix unhandled promise rejection in Express async route handlers by catching rejections and passing to next(err).',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Async route handler errors caught and forwarded to next()',
      'No unhandled promise rejection events',
    ],
    relevantFiles: ['src/middleware/error-handler.ts', 'src/index.ts'],
    relevantSymbols: ['errorHandler'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/middleware/error-handler.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'debugging-004',
    category: 'debugging',
    retrievalClass: 'class_4_debugging',
    title: 'Resolve circular dependency deadlock between AuthService and UserService',
    difficulty: 'hard',
    prompt:
      'Resolve circular dependency between AuthService and UserService by introducing an extracted interface or event emitter.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Decoupled imports eliminate circular dependency at runtime',
      'TypeScript builds cleanly without circular import warnings',
    ],
    relevantFiles: ['src/services/auth.service.ts', 'src/controllers/user.controller.ts'],
    relevantSymbols: ['AuthService', 'UserController'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/services/auth.service.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'debugging-005',
    category: 'debugging',
    retrievalClass: 'class_5_learning_reuse',
    title: 'Fix intermittent test failure caused by shared SQLite connection in parallel runners',
    difficulty: 'medium',
    prompt:
      'Apply validated lesson for in-memory SQLite isolation: create unique database instance per test suite instead of sharing singleton.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Tests allocate isolated in-memory databases',
      'Zero test flakiness in parallel execution',
    ],
    relevantFiles: ['src/services/database.service.ts', 'tests/validation.test.ts'],
    relevantSymbols: ['DatabaseService'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['tests/validation.test.ts'],
    },
    metrics: { primary: 'task_success' },
  },

  // 5. Refactoring (4 tasks)
  {
    id: 'refactor-001',
    category: 'refactoring',
    retrievalClass: 'class_1_exact',
    title:
      'Extract validation schema definitions from UserController into separate validation utility',
    difficulty: 'easy',
    prompt:
      'Extract email and password validation logic from UserController into src/utils/validation.ts.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Reusable validation functions in src/utils/validation.ts',
      'UserController imports and delegates to validation functions',
    ],
    relevantFiles: ['src/controllers/user.controller.ts', 'src/utils/validation.ts'],
    relevantSymbols: ['UserController', 'isValidEmail', 'isValidPassword'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/utils/validation.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'refactor-002',
    category: 'refactoring',
    retrievalClass: 'class_2_vocabulary_mismatch',
    title: 'Decouple domain business logic from Express request/response transport layer',
    difficulty: 'medium',
    prompt:
      'Separate pure user business logic from Express req/res objects by creating dedicated service methods that take DTOs.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Service layer takes plain TypeScript objects (DTOs) and returns domain models',
      'Controller only handles HTTP transport status codes and headers',
    ],
    relevantFiles: ['src/controllers/user.controller.ts', 'src/services/auth.service.ts'],
    relevantSymbols: ['UserController'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/controllers/user.controller.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'refactor-003',
    category: 'refactoring',
    retrievalClass: 'class_3_architectural_context',
    title:
      'Refactor raw SQL strings into parameterized query builder respecting zero-dependency constraint',
    difficulty: 'medium',
    prompt:
      'Refactor raw SQL string concatenation in DatabaseService into parameterized helper functions without adding third-party ORMs.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Zero new npm dependencies added',
      'All SQL statements use prepared ? parameters',
    ],
    relevantFiles: ['src/services/database.service.ts'],
    relevantSymbols: ['DatabaseService'],
    relevantMemoryKeys: ['zero-orm-architectural-constraint'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/services/database.service.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'refactor-004',
    category: 'refactoring',
    retrievalClass: 'class_5_learning_reuse',
    title: 'Migrate legacy callback-based async operations to async/await with error boundaries',
    difficulty: 'hard',
    prompt:
      'Refactor legacy callback file read operations to fs/promises with structured error boundaries based on validated project learning.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Uses node:fs/promises async/await cleanly',
      'Errors caught and handled gracefully',
    ],
    relevantFiles: ['src/index.ts', 'src/services/database.service.ts'],
    relevantSymbols: ['DatabaseService'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/index.ts'],
    },
    metrics: { primary: 'task_success' },
  },

  // 6. Testing (3 tasks)
  {
    id: 'test-001',
    category: 'testing',
    retrievalClass: 'class_1_exact',
    title: 'Add unit tests for ValidationService.isValidEmail and isValidPassword',
    difficulty: 'easy',
    prompt:
      'Add comprehensive unit tests in tests/validation.test.ts testing edge cases for email and password validation.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Tests test valid and invalid emails (e.g. missing @, invalid domain)',
      'Tests test password rules (length, numbers, special characters)',
    ],
    relevantFiles: ['src/utils/validation.ts', 'tests/validation.test.ts'],
    relevantSymbols: ['isValidEmail', 'isValidPassword'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['tests/validation.test.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'test-002',
    category: 'testing',
    retrievalClass: 'class_2_vocabulary_mismatch',
    title: 'Add regression tests simulating token tamper and expired signature scenarios',
    difficulty: 'medium',
    prompt:
      'Add automated security regression tests verifying that altered payloads or expired tokens are rejected with 401.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Simulates tampered signature',
      'Simulates expired token timestamp',
      'Asserts 401 response',
    ],
    relevantFiles: ['src/services/auth.service.ts', 'tests/validation.test.ts'],
    relevantSymbols: ['AuthService'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['tests/validation.test.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'test-003',
    category: 'testing',
    retrievalClass: 'class_3_architectural_context',
    title: 'Implement integration test suite verifying graceful shutdown on SIGTERM',
    difficulty: 'hard',
    prompt:
      'Implement integration test verifying server closes HTTP listeners and active database handles upon receiving SIGTERM.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Process listener intercepts SIGTERM',
      'Database connection closed cleanly before process exit',
    ],
    relevantFiles: ['src/index.ts', 'src/services/database.service.ts'],
    relevantSymbols: ['DatabaseService'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/index.ts'],
    },
    metrics: { primary: 'task_success' },
  },

  // 7. Architecture / Unfamiliar (3 tasks)
  {
    id: 'arch-001',
    category: 'architecture',
    retrievalClass: 'class_3_architectural_context',
    title: 'Integrate structured request logging following centralized telemetry architecture',
    difficulty: 'medium',
    prompt:
      'Add middleware logging HTTP method, path, status, and duration in JSON format while redacting Authorization headers as per security guidelines.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Middleware logs structured JSON format',
      'Authorization bearer tokens are redacted to [REDACTED]',
    ],
    relevantFiles: ['src/middleware/error-handler.ts', 'src/index.ts'],
    relevantSymbols: ['errorHandler'],
    relevantMemoryKeys: ['sanitized-logging-guideline'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/middleware/error-handler.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'arch-002',
    category: 'architecture',
    retrievalClass: 'class_2_vocabulary_mismatch',
    title: 'Introduce rate-limiting throttling mechanism at API gateway boundary',
    difficulty: 'hard',
    prompt:
      'Introduce IP-based request rate limiting (max 100 req/min) returning 429 Too Many Requests with Retry-After header.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Tracks request counts per IP in sliding window',
      'Returns 429 when threshold exceeded',
    ],
    relevantFiles: ['src/index.ts', 'src/middleware/error-handler.ts'],
    relevantSymbols: ['errorHandler'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/index.ts'],
    },
    metrics: { primary: 'task_success' },
  },
  {
    id: 'arch-003',
    category: 'architecture',
    retrievalClass: 'class_5_learning_reuse',
    title: 'Standardize configuration loading across environments with schema validation',
    difficulty: 'hard',
    prompt:
      'Standardize configuration loading from process.env using validated schema validation and defaults pattern from global learning.',
    repositoryFixture: 'sample-project',
    expectedBehavior: [
      'Validates presence of port, database path, jwt secret',
      'Provides fallback defaults for dev mode',
    ],
    relevantFiles: ['src/types/config.ts', 'src/index.ts'],
    relevantSymbols: ['AppConfig'],
    validation: {
      commands: ['npm test -- validation.test.ts'],
      expectedFiles: ['src/types/config.ts'],
    },
    metrics: { primary: 'task_success' },
  },
];
