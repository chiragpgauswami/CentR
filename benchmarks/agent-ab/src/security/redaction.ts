export function redactSecrets(text: string): string {
  if (!text) return text;

  let result = text;

  // Authorization headers
  result = result.replace(/(Authorization:\s*Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]');

  // Common API key patterns
  result = result.replace(/(api[_-]?key\s*[:=]\s*["']?)[A-Za-z0-9_\-]{8,}["']?/gi, '$1[REDACTED]');
  result = result.replace(/(secret\s*[:=]\s*["']?)[A-Za-z0-9_\-]{8,}["']?/gi, '$1[REDACTED]');
  result = result.replace(/(token\s*[:=]\s*["']?)[A-Za-z0-9_\-]{8,}["']?/gi, '$1[REDACTED]');
  result = result.replace(/(password\s*[:=]\s*["']?)[^\s"']{4,}["']?/gi, '$1[REDACTED]');

  // Private keys
  result = result.replace(
    /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g,
    '[REDACTED_PRIVATE_KEY]',
  );

  return result;
}
