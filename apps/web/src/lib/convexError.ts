/** Extract a clean error message from Convex action/mutation errors.
 *
 * Convex wraps server errors with metadata and stack traces:
 *   "[CONVEX A(name)] [Request ID: ...] Server Error\nUncaught Error: <msg> at <stack>"
 *
 * This extracts just the human-readable message (e.g. "Repository not found"). */
export function extractErrorMessage(e: unknown, fallback: string): string {
  if (!(e instanceof Error)) return fallback;
  const msg = e.message;

  if (msg.includes("[CONVEX")) {
    const match = msg.match(/Uncaught Error: (.+?)(?:\s+at\s+\S+\s*\()/);
    return match?.[1]?.trim() ?? fallback;
  }

  return msg;
}
