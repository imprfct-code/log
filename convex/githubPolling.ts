import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  fetchGitHubToken,
  fetchNewCommitsAllBranches,
  fetchBranches,
  mapGitHubCommits,
} from "./githubApi";

export const updateLastPolledAt = internalMutation({
  args: { commitmentIds: v.array(v.id("commitments")) },
  handler: async (ctx, { commitmentIds }) => {
    const now = Date.now();
    for (const id of commitmentIds) {
      await ctx.db.patch(id, { lastPolledAt: now });
    }
  },
});

export const getPollingTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_status_and_lastActivityAt", (q) => q.eq("status", "building"))
      .take(500);

    const targets: Array<{
      commitmentId: Id<"commitments">;
      repo: string;
      userId: Id<"users">;
      clerkUserId: string;
      lastPolledAt: number | undefined;
    }> = [];

    for (const c of commitments) {
      if (!c.repo || c.webhookId) continue;

      const user = await ctx.db.get(c.userId);
      if (!user?.clerkUserId) continue;

      targets.push({
        commitmentId: c._id,
        repo: c.repo,
        userId: c.userId,
        clerkUserId: user.clerkUserId,
        lastPolledAt: c.lastPolledAt,
      });
    }

    return targets;
  },
});

export const setupPolling = internalAction({
  args: { commitmentId: v.id("commitments"), repo: v.string() },
  handler: async (ctx, { commitmentId, repo }) => {
    const data = await ctx.runQuery(internal.github.getCommitmentWithUser, { commitmentId });
    if (!data) return;

    const { user } = data;
    if (!user?.clerkUserId) return;

    const token = await fetchGitHubToken(user.clerkUserId);

    const branches = token ? await fetchBranches(repo, token) : [];
    for (const branch of branches.length > 0 ? branches : [undefined]) {
      await ctx.scheduler.runAfter(0, internal.github.backfillAllCommits, {
        commitmentId,
        repo,
        branch,
      });
    }

    await ctx.runMutation(internal.githubPolling.updateLastPolledAt, {
      commitmentIds: [commitmentId],
    });
  },
});

/** Cron entry point: get targets, group by repo, schedule one pollRepo per group. */
export const dispatchPolling = internalAction({
  args: {},
  handler: async (ctx) => {
    const targets = await ctx.runQuery(internal.githubPolling.getPollingTargets, {});
    if (targets.length === 0) return;

    const repoGroups = new Map<
      string,
      {
        commitmentIds: Id<"commitments">[];
        userIds: Id<"users">[];
        clerkUserId: string;
        oldestLastPolledAt: number | undefined;
      }
    >();

    for (const t of targets) {
      const existing = repoGroups.get(t.repo);
      if (existing) {
        existing.commitmentIds.push(t.commitmentId);
        existing.userIds.push(t.userId);
        if (
          t.lastPolledAt !== undefined &&
          (existing.oldestLastPolledAt === undefined ||
            t.lastPolledAt < existing.oldestLastPolledAt)
        ) {
          existing.oldestLastPolledAt = t.lastPolledAt;
        }
      } else {
        repoGroups.set(t.repo, {
          commitmentIds: [t.commitmentId],
          userIds: [t.userId],
          clerkUserId: t.clerkUserId,
          oldestLastPolledAt: t.lastPolledAt,
        });
      }
    }

    for (const [repo, group] of repoGroups) {
      await ctx.scheduler.runAfter(0, internal.githubPolling.pollRepo, {
        repo,
        commitmentIds: group.commitmentIds,
        userIds: group.userIds,
        clerkUserId: group.clerkUserId,
        since: group.oldestLastPolledAt
          ? new Date(group.oldestLastPolledAt).toISOString()
          : undefined,
      });
    }
  },
});

/** Poll a single repo for new commits. Scheduled by dispatchPolling. */
export const pollRepo = internalAction({
  args: {
    repo: v.string(),
    commitmentIds: v.array(v.id("commitments")),
    userIds: v.array(v.id("users")),
    clerkUserId: v.string(),
    since: v.optional(v.string()),
  },
  handler: async (ctx, { repo, commitmentIds, userIds, clerkUserId, since }) => {
    const token = await fetchGitHubToken(clerkUserId);
    if (!token) return;

    const rawCommits = await fetchNewCommitsAllBranches(repo, token, since);
    if (rawCommits.length === 0) {
      await ctx.runMutation(internal.githubPolling.updateLastPolledAt, { commitmentIds });
      return;
    }

    const commits = mapGitHubCommits(rawCommits);

    for (let i = 0; i < commitmentIds.length; i++) {
      await ctx.runMutation(internal.github.insertGitCommits, {
        commitmentId: commitmentIds[i],
        userId: userIds[i],
        commits,
      });
    }

    await ctx.runMutation(internal.githubPolling.updateLastPolledAt, { commitmentIds });
  },
});
