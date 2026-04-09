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
  // BASE_TIME = 2024-06-15T12:00:00Z = Saturday = weekday index 5

  test("increments today's weekday slot from empty", () => {
    const result = updateActivity([0, 0, 0, 0, 0, 0, 0], BASE_TIME);
    // Saturday = slot 5
    expect(result).toEqual([0, 0, 0, 0, 0, 1, 0]);
  });

  test("increments existing count for same weekday", () => {
    const result = updateActivity([0, 0, 0, 0, 0, 3, 0], BASE_TIME);
    expect(result).toEqual([0, 0, 0, 0, 0, 4, 0]);
  });

  test("same week different day preserves other days", () => {
    // lastActivityAt = Friday Jun 14 (same week, Mon Jun 10 – Sun Jun 16)
    const result = updateActivity([0, 0, 0, 0, 2, 0, 0], BASE_TIME - DAY);
    // Friday slot 4 kept, Saturday slot 5 incremented
    expect(result).toEqual([0, 0, 0, 0, 2, 1, 0]);
  });

  test("same week accumulates across multiple days", () => {
    // lastActivityAt = Wednesday Jun 12 (same week)
    const result = updateActivity([1, 0, 3, 0, 0, 0, 0], BASE_TIME - 3 * DAY);
    expect(result).toEqual([1, 0, 3, 0, 0, 1, 0]);
  });

  test("resets array when last activity was previous week", () => {
    // lastActivityAt = Sun Jun 9 (previous week)
    const result = updateActivity([1, 2, 3, 4, 5, 6, 7], BASE_TIME - 6 * DAY);
    expect(result).toEqual([0, 0, 0, 0, 0, 1, 0]);
  });

  test("resets array when many days have passed", () => {
    const result = updateActivity([9, 9, 9, 9, 9, 9, 9], BASE_TIME - 30 * DAY);
    expect(result).toEqual([0, 0, 0, 0, 0, 1, 0]);
  });

  test("handles empty activity same week", () => {
    const result = updateActivity([0, 0, 0, 0, 0, 0, 0], BASE_TIME - 2 * DAY);
    expect(result).toEqual([0, 0, 0, 0, 0, 1, 0]);
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

  test("strips markdown heading prefix", () => {
    expect(extractTitle("# Hello world")).toBe("Hello world");
    expect(extractTitle("## Second level")).toBe("Second level");
    expect(extractTitle("###### Deep heading")).toBe("Deep heading");
  });

  test("strips inline media references", () => {
    expect(extractTitle("![video.mp4](upload:abc123)")).toBe("");
  });

  test("keeps text around media references", () => {
    expect(extractTitle("Check this ![cat.gif](upload:abc) out")).toBe("Check this out");
  });

  test("B2: extracts first sentence as title when line > 100 chars", () => {
    const content =
      "Built the new auth flow with GitHub OAuth. It handles token refresh and session persistence across multiple browser tabs for all users.";
    expect(extractTitle(content)).toBe("Built the new auth flow with GitHub OAuth.");
  });

  test("B2: uses sentence ending with ! or ?", () => {
    const content =
      "Finally shipped the landing page! The conversion rate improved by 40% compared to the old design with static hero section.";
    expect(extractTitle(content)).toBe("Finally shipped the landing page!");
  });

  test("B2: skips short sentence-like fragments (abbreviations)", () => {
    // "v2.0" has a period at position 3, which is < 20 minimum
    const content = "v2.0 " + "a".repeat(120);
    const result = extractTitle(content);
    expect(result.endsWith("\u2026")).toBe(true);
  });

  test("fallback: truncates at word boundary when no sentence found", () => {
    const content =
      "This is a very long sentence without any punctuation that just keeps going and going and going forever without stopping at all ever";
    const result = extractTitle(content);
    expect(result.endsWith("\u2026")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(101);
    // Should not cut mid-word: char after truncation point (in original) should be a space
    const textBeforeEllipsis = result.slice(0, -1);
    expect(content[textBeforeEllipsis.length]).toBe(" ");
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

  test("update post changes content and title", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    const entryId = await as.mutation(api.devlog.create, {
      commitmentId,
      type: "post",
      content: "Original title\n\nOriginal body.",
    });

    await as.mutation(api.devlog.update, {
      entryId,
      content: "Updated title\n\nUpdated body text.",
    });

    const entry = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(entry!.text).toBe("Updated title");
    expect(entry!.body).toBe("Updated title\n\nUpdated body text.");
  });

  test("update blocks empty post", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    const entryId = await as.mutation(api.devlog.create, {
      commitmentId,
      type: "post",
      content: "Some content",
    });

    await expect(
      as.mutation(api.devlog.update, { entryId, content: "   ", attachments: [] }),
    ).rejects.toThrow("Post cannot be empty");
  });

  test("update blocks non-owner edit", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);
    const { as: other } = await setupUser(t, "user2", "other");

    const entryId = await as.mutation(api.devlog.create, {
      commitmentId,
      type: "post",
      content: "My post",
    });

    await expect(other.mutation(api.devlog.update, { entryId, content: "Hacked" })).rejects.toThrow(
      "Not the owner",
    );
  });

  test("update blocks editing git commits", async () => {
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

    await expect(as.mutation(api.devlog.update, { entryId, content: "changed" })).rejects.toThrow(
      "Can only edit posts",
    );
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
