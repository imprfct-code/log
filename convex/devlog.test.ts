import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { updateActivity } from "./devlog";

const DAY = 86_400_000;
const BASE_TIME = new Date("2024-06-15T12:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("updateActivity", () => {
  test("increments today when last activity is same day", () => {
    const result = updateActivity([0, 0, 0, 0, 0, 0, 0], BASE_TIME);
    expect(result).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });

  test("increments existing today count", () => {
    const result = updateActivity([0, 0, 0, 0, 0, 0, 3], BASE_TIME);
    expect(result).toEqual([0, 0, 0, 0, 0, 0, 4]);
  });

  test("shifts by 1 day and increments", () => {
    const result = updateActivity([1, 2, 3, 4, 5, 6, 7], BASE_TIME - DAY);
    // [2, 3, 4, 5, 6, 7, 0] shifted left by 1, then [6] += 1
    expect(result).toEqual([2, 3, 4, 5, 6, 7, 1]);
  });

  test("shifts by 3 days", () => {
    const result = updateActivity([1, 2, 3, 4, 5, 6, 7], BASE_TIME - 3 * DAY);
    // shift left 3: [4, 5, 6, 7, 0, 0, 0], then [6] += 1
    expect(result).toEqual([4, 5, 6, 7, 0, 0, 1]);
  });

  test("shifts by 6 days preserves first element", () => {
    const result = updateActivity([1, 2, 3, 4, 5, 6, 7], BASE_TIME - 6 * DAY);
    // shift left 6: [7, 0, 0, 0, 0, 0, 0], then [6] += 1
    expect(result).toEqual([7, 0, 0, 0, 0, 0, 1]);
  });

  test("resets entire array when 7+ days have passed", () => {
    const result = updateActivity([1, 2, 3, 4, 5, 6, 7], BASE_TIME - 7 * DAY);
    expect(result).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });

  test("resets entire array when many days have passed", () => {
    const result = updateActivity([9, 9, 9, 9, 9, 9, 9], BASE_TIME - 30 * DAY);
    expect(result).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });

  test("handles empty-ish activity with gap", () => {
    const result = updateActivity([0, 0, 0, 0, 0, 0, 0], BASE_TIME - 2 * DAY);
    expect(result).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });
});
