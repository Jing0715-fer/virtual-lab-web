/**
 * Safely parse a JSON string that is expected to be an array.
 * Returns the parsed array if valid, or an empty array on failure.
 */
export function safeParseJsonArray(str: string): unknown[] {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Safely parse a JSON string. Returns the parsed value or null on failure.
 */
export function safeJsonParse<T = unknown>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
