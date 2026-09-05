export interface EvaluationResult {
  success: boolean;
  requiresManualReview: boolean;
  testsExecuted: boolean;
  testsPassed: boolean;
  testsFailedCount: number;
  testsPassedCount: number;
  typecheckPassed: boolean;
  lintPassed: boolean;
  requiredStringsMatched: boolean;
  forbiddenStringsAbsent: boolean;
  expectedFilesPresent: boolean;
  failureReasons: string[];
  executionLogs?: string;
}
