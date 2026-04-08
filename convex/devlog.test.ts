import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { api } from "./_generated/api";
import { updateActivity, extractTitle } from "./devlog";
import { testCtx, setupUserWithCommitment, setupUser } from "./testing.test";

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

describe("extractTitle", () => {
  test("returns first line of multi-line content", () => {
    expect(extractTitle("Hello world\nThis is the body")).toBe("Hello world");
  });

  test("returns full text when single line", () => {
    expect(extractTitle("Short update")).toBe("Short update");
  });

  test("truncates at 100 chars with ellipsis", () => {
    const long = "a".repeat(120);
    const result = extractTitle(long);
    expect(result.length).toBe(101); // 100 chars + ellipsis
    expect(result.endsWith("\u2026")).toBe(true);
  });

  test("trims whitespace from first line", () => {
    expect(extractTitle("  Hello  \nBody")).toBe("Hello");
  });

  test("handles empty string", () => {
    expect(extractTitle("")).toBe("");
  });

  test("handles newline-only content", () => {
    expect(extractTitle("\n\nBody only")).toBe("");
  });

  test("strips inline media references", () => {
    expect(extractTitle("![video.mp4](upload:abc123)")).toBe("");
  });

  test("keeps text around media references", () => {
    expect(extractTitle("Check this ![cat.gif](upload:abc) out")).toBe("Check this out");
  });
});

describe("devlog mutations", () => {
  test("create post with content auto-splits text/body", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    const entryId = await as.mutation(api.devlog.create, {
      commitmentId,
      type: "post",
      content: "Day 3: auth works\n\nFinally got Clerk integration done.",
    });

    const entry = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(entry).not.toBeNull();
    expect(entry!.type).toBe("post");
    expect(entry!.text).toBe("Day 3: auth works");
    expect(entry!.body).toBe("Day 3: auth works\n\nFinally got Clerk integration done.");
  });

  test("create blocks empty post", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await expect(
      as.mutation(api.devlog.create, { commitmentId, type: "post", content: "   " }),
    ).rejects.toThrow("Post cannot be empty");
  });

  test("create blocks post on shipped commitment", async () => {
    const t = testCtx();
    const { userId, as } = await setupUser(t);

    const commitmentId = await t.run(async (ctx) =>
      ctx.db.insert("commitments", {
        userId,
        text: "Shipped thing",
        status: "shipped",
        commentCount: 0,
        respectCount: 0,
        lastActivityAt: Date.now(),
        activity: [0, 0, 0, 0, 0, 0, 0],
      }),
    );

    await expect(
      as.mutation(api.devlog.create, { commitmentId, type: "post", content: "test" }),
    ).rejects.toThrow("Cannot post to shipped commitment");
  });

  test("remove deletes post and associated comments", async () => {
    const t = testCtx();
    const { userId, as, commitmentId } = await setupUserWithCommitment(t);

    const entryId = await t.run(async (ctx) =>
      ctx.db.insert("devlogEntries", {
        commitmentId,
        userId,
        type: "post",
        text: "test",
        body: "test body",
        committedAt: Date.now(),
        commentCount: 1,
      }),
    );

    // Add a comment on the entry
    await t.run(async (ctx) => {
      await ctx.db.insert("comments", {
        userId,
        commitmentId,
        devlogEntryId: entryId,
        text: "nice!",
      });
      await ctx.db.patch(commitmentId, { commentCount: 1 });
    });

    await as.mutation(api.devlog.remove, { entryId });

    const entry = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(entry).toBeNull();

    // Comment should also be deleted
    const comments = await t.run(async (ctx) =>
      ctx.db
        .query("comments")
        .withIndex("by_devlogEntryId", (q) => q.eq("devlogEntryId", entryId))
        .collect(),
    );
    expect(comments).toHaveLength(0);

    // Commitment comment count should be decremented
    const commitment = await t.run(async (ctx) => ctx.db.get(commitmentId));
    expect(commitment!.commentCount).toBe(0);
  });

  test("remove blocks deletion of git commits", async () => {
    const t = testCtx();
    const { userId, as, commitmentId } = await setupUserWithCommitment(t);

    const entryId = await t.run(async (ctx) =>
      ctx.db.insert("devlogEntries", {
        commitmentId,
        userId,
        type: "git_commit",
        text: "fix: something",
        hash: "abc1234",
        committedAt: Date.now(),
        commentCount: 0,
      }),
    );

    await expect(as.mutation(api.devlog.remove, { entryId })).rejects.toThrow(
      "Can only delete posts",
    );
  });

  test("remove blocks non-owner deletion", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupUserWithCommitment(t);
    const { as: other } = await setupUser(t, "user2", "other");

    const entryId = await t.run(async (ctx) =>
      ctx.db.insert("devlogEntries", {
        commitmentId,
        userId,
        type: "post",
        text: "my post",
        committedAt: Date.now(),
        commentCount: 0,
      }),
    );

    await expect(other.mutation(api.devlog.remove, { entryId })).rejects.toThrow("Not the owner");
  });
});
