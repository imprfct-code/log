import { describe, expect, test } from "vite-plus/test";
import { DAY_MS, utcDateString } from "./dates";

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
