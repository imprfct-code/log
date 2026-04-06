/** Milliseconds in one day. */
export const DAY_MS = 86_400_000;

/** Returns UTC date string (YYYY-MM-DD). */
export function utcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
