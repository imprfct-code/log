import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { daysSince, formatTimeAgo, formatShippedIn } from "./formatTime";

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const NOW = new Date("2024-06-15T12:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("daysSince", () => {
  test("returns 1 for very recent timestamp", () => {
    expect(daysSince(NOW - 1000)).toBe(1);
  });

  test("returns 1 for timestamp exactly now", () => {
    // Math.ceil(0 / DAY) = 0, but Math.max(1, 0) = 1
    expect(daysSince(NOW)).toBe(1);
  });

  test("returns 1 for timestamp less than 1 day ago", () => {
    expect(daysSince(NOW - DAY + 1)).toBe(1);
  });

  test("returns 1 for timestamp exactly 1 day ago", () => {
    // Math.ceil(1) = 1, Math.max(1, 1) = 1
    expect(daysSince(NOW - DAY)).toBe(1);
  });

  test("returns 2 for timestamp slightly over 1 day ago", () => {
    expect(daysSince(NOW - DAY - 1)).toBe(2);
  });

  test("returns correct value for multi-day gap", () => {
    expect(daysSince(NOW - 10 * DAY)).toBe(10);
  });

  test("returns large value for old timestamps", () => {
    expect(daysSince(NOW - 365 * DAY)).toBe(365);
  });
});

describe("formatTimeAgo", () => {
  test('returns "just now" for less than a minute', () => {
    expect(formatTimeAgo(NOW - 30_000)).toBe("just now");
    expect(formatTimeAgo(NOW - 1)).toBe("just now");
    expect(formatTimeAgo(NOW)).toBe("just now");
  });

  test("returns minutes for 1-59 minutes", () => {
    expect(formatTimeAgo(NOW - MINUTE)).toBe("1m ago");
    expect(formatTimeAgo(NOW - 5 * MINUTE)).toBe("5m ago");
    expect(formatTimeAgo(NOW - 59 * MINUTE)).toBe("59m ago");
  });

  test("returns hours for 1-23 hours", () => {
    expect(formatTimeAgo(NOW - HOUR)).toBe("1h ago");
    expect(formatTimeAgo(NOW - 3 * HOUR)).toBe("3h ago");
    expect(formatTimeAgo(NOW - 23 * HOUR)).toBe("23h ago");
  });

  test('returns "1d ago" for exactly one day', () => {
    expect(formatTimeAgo(NOW - DAY)).toBe("1d ago");
  });

  test("returns days for 2-29 days", () => {
    expect(formatTimeAgo(NOW - 2 * DAY)).toBe("2d ago");
    expect(formatTimeAgo(NOW - 15 * DAY)).toBe("15d ago");
    expect(formatTimeAgo(NOW - 29 * DAY)).toBe("29d ago");
  });

  test('returns "1mo ago" for 30-59 days', () => {
    expect(formatTimeAgo(NOW - 30 * DAY)).toBe("1mo ago");
    expect(formatTimeAgo(NOW - 59 * DAY)).toBe("1mo ago");
  });

  test("returns months for 60+ days", () => {
    expect(formatTimeAgo(NOW - 60 * DAY)).toBe("2mo ago");
    expect(formatTimeAgo(NOW - 90 * DAY)).toBe("3mo ago");
    expect(formatTimeAgo(NOW - 365 * DAY)).toBe("12mo ago");
  });
});

describe("formatShippedIn", () => {
  test('returns "< 1 day" for 0 days', () => {
    expect(formatShippedIn(NOW, NOW)).toBe("< 1 day");
    expect(formatShippedIn(NOW + 1000, NOW)).toBe("< 1 day");
    expect(formatShippedIn(NOW + DAY - 1, NOW)).toBe("< 1 day");
  });

  test('returns "1 day" for exactly 1 day', () => {
    expect(formatShippedIn(NOW + DAY, NOW)).toBe("1 day");
  });

  test("returns days for N days", () => {
    expect(formatShippedIn(NOW + 2 * DAY, NOW)).toBe("2 days");
    expect(formatShippedIn(NOW + 5 * DAY, NOW)).toBe("5 days");
    expect(formatShippedIn(NOW + 10 * DAY, NOW)).toBe("10 days");
  });

  test("clamps to < 1 day when shippedAt < createdAt (out-of-order timestamps)", () => {
    expect(formatShippedIn(NOW - 1000, NOW)).toBe("< 1 day");
    expect(formatShippedIn(NOW - DAY, NOW)).toBe("< 1 day");
  });
});
