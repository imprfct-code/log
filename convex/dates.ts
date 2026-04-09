/** Milliseconds in one day. */
export const DAY_MS = 86_400_000;

/** Returns UTC date string (YYYY-MM-DD). */
export function utcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Returns ISO weekday index: Monday = 0, Sunday = 6. */
export function utcWeekday(ts: number = Date.now()): number {
  const day = new Date(ts).getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return day === 0 ? 6 : day - 1;
}

/** Returns timestamp of Monday 00:00:00 UTC for the week containing `ts`. */
export function utcMondayOf(ts: number): number {
  const d = new Date(ts);
  const dayOfWeek = d.getUTCDay(); // 0=Sun
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset);
}

/** Returns zeros if lastActivityAt is from a previous week, otherwise returns the original array. */
export function currentWeekActivity(activity: number[], lastActivityAt: number): number[] {
  return utcMondayOf(lastActivityAt) < utcMondayOf(Date.now()) ? [0, 0, 0, 0, 0, 0, 0] : activity;
}
