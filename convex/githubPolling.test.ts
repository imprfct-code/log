import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { internal } from "./_generated/api";
import { testCtx } from "./testing.test";
import type { Id } from "./_generated/dataModel";

const BASE_TIME = new Date("2024-06-15T12:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

/** Create a user with clerkUserId set (required for polling targets). */
async function setupPollingUser(t: ReturnType<typeof testCtx>, clerkUserId = "clerk_123") {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      tokenIdentifier: "https://test.clerk.dev|user1",
      clerkUserId,
      username: "testuser",
      streak: 0,
    });
  });
}

function commitmentDefaults(userId: Id<"users">) {
  return {
    userId,
    text: "Build something",
    status: "building" as const,
    commentCount: 0,
    respectCount: 0,
    lastActivityAt: BASE_TIME,
    activity: [0, 0, 0, 0, 0, 0, 0],
  };
}

describe("getPollingTargets", () => {
  test("returns building commitments with repo and no webhookId", async () => {
    const t = testCtx();
    const userId = await setupPollingUser(t);

    const commitmentId = await t.run(async (ctx) => {
      return await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo",
      });
    });

    const targets = await t.query(internal.githubPolling.getPollingTargets, {});

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      commitmentId,
      repo: "owner/repo",
      userId,
      clerkUserId: "clerk_123",
    });
  });

  test("skips commitments without repo", async () => {
    const t = testCtx();
    const userId = await setupPollingUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        // no repo
      });
    });

    const targets = await t.query(internal.githubPolling.getPollingTargets, {});
    expect(targets).toHaveLength(0);
  });

  test("skips commitments with webhookId (webhook mode)", async () => {
    const t = testCtx();
    const userId = await setupPollingUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo",
        webhookId: 12345,
      });
    });

    const targets = await t.query(internal.githubPolling.getPollingTargets, {});
    expect(targets).toHaveLength(0);
  });

  test("skips shipped commitments", async () => {
    const t = testCtx();
    const userId = await setupPollingUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo",
        status: "shipped",
      });
    });

    const targets = await t.query(internal.githubPolling.getPollingTargets, {});
    expect(targets).toHaveLength(0);
  });

  test("skips commitments where user has no clerkUserId", async () => {
    const t = testCtx();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "https://test.clerk.dev|noclerk",
        username: "noclerk",
        streak: 0,
        // no clerkUserId
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo",
      });
    });

    const targets = await t.query(internal.githubPolling.getPollingTargets, {});
    expect(targets).toHaveLength(0);
  });

  test("includes latestCommitTime from entries", async () => {
    const t = testCtx();
    const userId = await setupPollingUser(t);

    const commitmentId = await t.run(async (ctx) => {
      return await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo",
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("devlogEntries", {
        commitmentId,
        userId,
        type: "git_commit",
        text: "test commit",
        committedAt: BASE_TIME - 60_000,
        commentCount: 0,
      });
    });

    const targets = await t.query(internal.githubPolling.getPollingTargets, {});
    expect(targets[0].latestCommitTime).toBe(BASE_TIME - 60_000);
  });

  test("returns undefined latestCommitTime when no entries", async () => {
    const t = testCtx();
    const userId = await setupPollingUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo",
      });
    });

    const targets = await t.query(internal.githubPolling.getPollingTargets, {});
    expect(targets[0].latestCommitTime).toBeUndefined();
  });

  test("returns multiple targets from different repos", async () => {
    const t = testCtx();
    const userId = await setupPollingUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo-a",
      });
      await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo-b",
      });
    });

    const targets = await t.query(internal.githubPolling.getPollingTargets, {});
    expect(targets).toHaveLength(2);
    expect(targets.map((t) => t.repo).sort()).toEqual(["owner/repo-a", "owner/repo-b"]);
  });
});

describe("updateLastPolledAt", () => {
  test("updates lastPolledAt for given commitment IDs", async () => {
    const t = testCtx();
    const userId = await setupPollingUser(t);

    const [id1, id2] = await t.run(async (ctx) => {
      const a = await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo",
      });
      const b = await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo",
      });
      return [a, b];
    });

    await t.mutation(internal.githubPolling.updateLastPolledAt, {
      commitmentIds: [id1, id2],
    });

    const [c1, c2] = await t.run(async (ctx) => {
      return [await ctx.db.get(id1), await ctx.db.get(id2)];
    });

    expect(c1?.lastPolledAt).toBe(BASE_TIME);
    expect(c2?.lastPolledAt).toBe(BASE_TIME);
  });

  test("does not affect other commitments", async () => {
    const t = testCtx();
    const userId = await setupPollingUser(t);

    const [target, other] = await t.run(async (ctx) => {
      const a = await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo-a",
      });
      const b = await ctx.db.insert("commitments", {
        ...commitmentDefaults(userId),
        repo: "owner/repo-b",
      });
      return [a, b];
    });

    await t.mutation(internal.githubPolling.updateLastPolledAt, {
      commitmentIds: [target],
    });

    const otherCommitment = await t.run(async (ctx) => {
      return await ctx.db.get(other);
    });

    expect(otherCommitment?.lastPolledAt).toBeUndefined();
  });
});
