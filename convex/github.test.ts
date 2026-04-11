import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { internal } from "./_generated/api";
import { setupUser, testCtx } from "./testing.test";

const BASE_TIME = new Date("2024-06-15T12:00:00Z").getTime();
const DAY = 86_400_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

function makeCommit(overrides: Partial<{ sha: string; message: string; timestamp: number }> = {}) {
  return {
    sha: overrides.sha ?? "abc123",
    message: overrides.message ?? "fix: something",
    author: "testuser",
    url: "https://github.com/owner/repo/commit/abc123",
    timestamp: overrides.timestamp ?? BASE_TIME,
  };
}

async function setupCommitment(t: ReturnType<typeof testCtx>) {
  const { userId } = await setupUser(t);
  const commitmentId = await t.run(async (ctx) => {
    return await ctx.db.insert("commitments", {
      userId,
      text: "Build something",
      repo: "owner/repo",
      status: "building",
      commentCount: 0,
      boostCount: 0,
      lastActivityAt: BASE_TIME - DAY,
      activity: [0, 0, 0, 0, 0, 0, 0],
    });
  });
  return { userId, commitmentId };
}

describe("insertGitCommits", () => {
  test("inserts commits as devlog entries", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupCommitment(t);

    await t.mutation(internal.github.insertGitCommits, {
      commitmentId,
      userId,
      commits: [makeCommit({ sha: "aaa" }), makeCommit({ sha: "bbb" })],
    });

    const entries = await t.run(async (ctx) => {
      return await ctx.db
        .query("devlogEntries")
        .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitmentId))
        .collect();
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.hash)).toEqual(["aaa", "bbb"]);
    expect(entries[0]).toMatchObject({
      type: "git_commit",
      text: "fix: something",
      gitAuthor: "testuser",
      commentCount: 0,
    });
  });

  test("deduplicates commits by SHA", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupCommitment(t);

    await t.mutation(internal.github.insertGitCommits, {
      commitmentId,
      userId,
      commits: [makeCommit({ sha: "aaa" })],
    });

    // Insert same SHA again
    await t.mutation(internal.github.insertGitCommits, {
      commitmentId,
      userId,
      commits: [makeCommit({ sha: "aaa" }), makeCommit({ sha: "bbb" })],
    });

    const entries = await t.run(async (ctx) => {
      return await ctx.db
        .query("devlogEntries")
        .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitmentId))
        .collect();
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.hash).sort((a, b) => (a ?? "").localeCompare(b ?? ""))).toEqual([
      "aaa",
      "bbb",
    ]);
  });

  test("skips if commitment does not exist", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupCommitment(t);

    // Delete the commitment so it no longer exists
    await t.run(async (ctx) => {
      await ctx.db.delete(commitmentId);
    });

    // Should not throw — just return early
    await t.mutation(internal.github.insertGitCommits, {
      commitmentId,
      userId,
      commits: [makeCommit()],
    });

    const entries = await t.run(async (ctx) => {
      return await ctx.db
        .query("devlogEntries")
        .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitmentId))
        .collect();
    });

    expect(entries).toHaveLength(0);
  });

  test("skips when commits array is empty", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupCommitment(t);

    await t.mutation(internal.github.insertGitCommits, {
      commitmentId,
      userId,
      commits: [],
    });

    const entries = await t.run(async (ctx) => {
      return await ctx.db
        .query("devlogEntries")
        .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitmentId))
        .collect();
    });

    expect(entries).toHaveLength(0);
  });

  test("updates commitment activity and lastActivityAt", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupCommitment(t);

    await t.mutation(internal.github.insertGitCommits, {
      commitmentId,
      userId,
      commits: [makeCommit({ sha: "aaa" })],
    });

    const commitment = await t.run(async (ctx) => {
      return await ctx.db.get(commitmentId);
    });

    expect(commitment?.lastActivityAt).toBe(BASE_TIME);
    // Saturday = weekday slot 5
    expect(commitment?.activity[5]).toBe(1);
  });

  test("does not update activity when all commits are duplicates", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupCommitment(t);

    await t.mutation(internal.github.insertGitCommits, {
      commitmentId,
      userId,
      commits: [makeCommit({ sha: "aaa" })],
    });

    // Record state after first insert
    const before = await t.run(async (ctx) => {
      return await ctx.db.get(commitmentId);
    });

    // Insert same commit again
    vi.setSystemTime(BASE_TIME + 1000);
    await t.mutation(internal.github.insertGitCommits, {
      commitmentId,
      userId,
      commits: [makeCommit({ sha: "aaa" })],
    });

    const after = await t.run(async (ctx) => {
      return await ctx.db.get(commitmentId);
    });

    // lastActivityAt should not have changed since no new commits were inserted
    expect(after?.lastActivityAt).toBe(before?.lastActivityAt);
  });

  test("updates user streak on new day", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupCommitment(t);

    // Set user's lastActiveDate to yesterday
    const yesterday = "2024-06-14";
    await t.run(async (ctx) => {
      await ctx.db.patch(userId, { lastActiveDate: yesterday, streak: 3 });
    });

    await t.mutation(internal.github.insertGitCommits, {
      commitmentId,
      userId,
      commits: [makeCommit({ sha: "aaa" })],
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user?.streak).toBe(4);
    expect(user?.lastActiveDate).toBe("2024-06-15");
  });

  test("resets streak when gap is more than one day", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupCommitment(t);

    // Set user's lastActiveDate to 3 days ago
    await t.run(async (ctx) => {
      await ctx.db.patch(userId, { lastActiveDate: "2024-06-12", streak: 5 });
    });

    await t.mutation(internal.github.insertGitCommits, {
      commitmentId,
      userId,
      commits: [makeCommit({ sha: "aaa" })],
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user?.streak).toBe(1);
    expect(user?.lastActiveDate).toBe("2024-06-15");
  });
});

describe("getCommitmentsByRepo", () => {
  test("returns only building commitments for a repo", async () => {
    const t = testCtx();
    const { userId } = await setupUser(t);

    await t.run(async (ctx) => {
      // Building commitment
      await ctx.db.insert("commitments", {
        userId,
        text: "Active",
        repo: "owner/repo",
        status: "building",
        commentCount: 0,
        boostCount: 0,
        lastActivityAt: BASE_TIME,
        activity: [0, 0, 0, 0, 0, 0, 0],
      });
      // Shipped commitment — should be excluded
      await ctx.db.insert("commitments", {
        userId,
        text: "Done",
        repo: "owner/repo",
        status: "shipped",
        commentCount: 0,
        boostCount: 0,
        lastActivityAt: BASE_TIME,
        activity: [0, 0, 0, 0, 0, 0, 0],
      });
    });

    const results = await t.query(internal.github.getCommitmentsByRepo, { repo: "owner/repo" });
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("Active");
  });

  test("returns empty array for unknown repo", async () => {
    const t = testCtx();
    const results = await t.query(internal.github.getCommitmentsByRepo, { repo: "unknown/repo" });
    expect(results).toEqual([]);
  });
});
