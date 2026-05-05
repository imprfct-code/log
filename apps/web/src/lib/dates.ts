/** ISO weekday: Monday = 0, Sunday = 6. */
export function utcWeekday(ts: number = Date.now()): number {
  const day = new Date(ts).getUTCDay();
  return day === 0 ? 6 : day - 1;
}
