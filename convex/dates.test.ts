import { describe, expect, test, vi } from "vite-plus/test";
import { DAY_MS, utcDateString, utcWeekday, utcMondayOf, currentWeekActivity } from "./dates";

describe("DAY_MS", () => {
  test("equals 86400000 milliseconds", () => {
    expect(DAY_MS).toBe(86_400_000);
  });
});

describe("utcDateString", () => {
  test("formats date as YYYY-MM-DD", () => {
    const date = new Date("2024-03-15T12:00:00Z");
    expect(utcDateString(date)).toBe("2024-03-15");
  });

  test("uses UTC regardless of late-night local time", () => {
    // 23:59 UTC on Dec 31 should still be Dec 31
    const date = new Date("2024-12-31T23:59:59Z");
    expect(utcDateString(date)).toBe("2024-12-31");
  });

  test("handles midnight UTC", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    expect(utcDateString(date)).toBe("2024-01-01");
  });

  test("handles first moment of new year", () => {
    const date = new Date("2025-01-01T00:00:00.001Z");
    expect(utcDateString(date)).toBe("2025-01-01");
  });

  test("returns YYYY-MM-DD format when called without args", () => {
    const result = utcDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("utcWeekday", () => {
  test("Monday = 0", () => {
    // 2024-06-10 is Monday
    expect(utcWeekday(new Date("2024-06-10T12:00:00Z").getTime())).toBe(0);
  });

  test("Saturday = 5", () => {
    // 2024-06-15 is Saturday
    expect(utcWeekday(new Date("2024-06-15T12:00:00Z").getTime())).toBe(5);
  });

  test("Sunday = 6", () => {
    // 2024-06-16 is Sunday
    expect(utcWeekday(new Date("2024-06-16T12:00:00Z").getTime())).toBe(6);
  });

  test("Friday = 4", () => {
    // 2024-06-14 is Friday
    expect(utcWeekday(new Date("2024-06-14T12:00:00Z").getTime())).toBe(4);
  });
});

describe("utcMondayOf", () => {
  test("returns Monday for a Saturday in the same week", () => {
    // 2024-06-15 (Sat) → Monday is 2024-06-10
    const monday = utcMondayOf(new Date("2024-06-15T12:00:00Z").getTime());
    expect(new Date(monday).toISOString()).toBe("2024-06-10T00:00:00.000Z");
  });

  test("returns same day for a Monday", () => {
    const monday = utcMondayOf(new Date("2024-06-10T18:00:00Z").getTime());
    expect(new Date(monday).toISOString()).toBe("2024-06-10T00:00:00.000Z");
  });

  test("returns previous Monday for a Sunday", () => {
    // 2024-06-16 (Sun) → Monday is 2024-06-10
    const monday = utcMondayOf(new Date("2024-06-16T12:00:00Z").getTime());
    expect(new Date(monday).toISOString()).toBe("2024-06-10T00:00:00.000Z");
  });

  test("different weeks have different Mondays", () => {
    const week1 = utcMondayOf(new Date("2024-06-15T12:00:00Z").getTime()); // Sat Jun 15
    const week2 = utcMondayOf(new Date("2024-06-09T12:00:00Z").getTime()); // Sun Jun 9
    expect(week1).not.toBe(week2);
  });
});

describe("currentWeekActivity", () => {
  test("returns same array when lastActivityAt is this week", () => {
    const activity = [1, 2, 0, 3, 0, 0, 0];
    const result = currentWeekActivity(activity, Date.now());
    expect(result).toEqual(activity);
  });

  test("returns zeros when lastActivityAt is a previous week", () => {
    const activity = [1, 2, 3, 4, 5, 6, 7];
    const twoWeeksAgo = Date.now() - 14 * DAY_MS;
    expect(currentWeekActivity(activity, twoWeeksAgo)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  test("returns zeros when lastActivityAt is exactly one week ago (different Monday)", () => {
    // Use a fixed Thursday to avoid edge cases at week boundaries
    const thu = new Date("2024-06-13T12:00:00Z").getTime();
    const prevThu = thu - 7 * DAY_MS;
    vi.setSystemTime(new Date(thu));
    expect(currentWeekActivity([9, 9, 9, 9, 9, 9, 9], prevThu)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    vi.useRealTimers();
  });
});
