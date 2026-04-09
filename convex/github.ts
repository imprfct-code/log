import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { utcWeekday, utcMondayOf } from "./dates";
import { updateStreak } from "./users";
import {
  fetchGitHubToken,
  githubApiHeaders,
  fetchCommitPage,
  fetchBranches,
  fetchNewCommitsAllBranches,
  mapGitHubCommits,
  findExistingHook,
  isRepositoryPrivate,
} from "./githubApi";

export const getCommitmentsByRepo = internalQuery({
  args: { repo: v.string() },
  handler: async (ctx, { repo }) => {
    return await ctx.db
      .query("commitments")
      .withIndex("by_repo_and_status", (q) => q.eq("repo", repo).eq("status", "building"))
      .take(50);
  },
});

export const getCommitmentWithUser = internalQuery({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    const commitment = await ctx.db.get(commitmentId);
    if (!commitment) return null;
    const user = await ctx.db.get(commitment.userId);
    return { commitment, user };
  },
});

/** Return the timestamp of the most recent devlog entry for a commitment. */
export const getLatestCommitTime = internalQuery({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    const latest = await ctx.db
      .query("devlogEntries")
      .withIndex("by_commitmentId_and_committedAt", (q) => q.eq("commitmentId", commitmentId))
      .order("desc")
      .first();
    return latest?.committedAt ?? null;
  },
});

export const storeWebhookId = internalMutation({
  args: { commitmentId: v.id("commitments"), webhookId: v.number() },
  handler: async (ctx, { commitmentId, webhookId }) => {
    await ctx.db.patch(commitmentId, { webhookId });
  },
});

export const clearWebhookId = internalMutation({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    await ctx.db.patch(commitmentId, { webhookId: undefined });
  },
});

const gitCommitValidator = v.object({
  sha: v.string(),
  message: v.string(),
  author: v.string(),
  url: v.string(),
  timestamp: v.number(),
  branch: v.optional(v.string()),
});

export const insertGitCommits = internalMutation({
  args: {
    commitmentId: v.id("commitments"),
    userId: v.id("users"),
    commits: v.array(gitCommitValidator),
  },
  handler: async (ctx, { commitmentId, userId, commits }) => {
    if (commits.length === 0) return;

    const commitment = await ctx.db.get(commitmentId);
    if (!commitment) return;

    const user = await ctx.db.get(userId);
    if (!user) return;

    let inserted = 0;
    const insertedTimestamps: number[] = [];

    for (const commit of commits) {
      const existing = await ctx.db
        .query("devlogEntries")
        .withIndex("by_commitmentId_and_hash", (q) =>
          q.eq("commitmentId", commitmentId).eq("hash", commit.sha),
        )
        .unique();

      if (existing) continue;

      await ctx.db.insert("devlogEntries", {
        commitmentId,
        userId,
        type: "git_commit",
        text: commit.message,
        hash: commit.sha,
        gitAuthor: commit.author,
        gitUrl: commit.url,
        gitBranch: commit.branch,
        committedAt: commit.timestamp,
        commentCount: 0,
      });
      inserted++;
      insertedTimestamps.push(commit.timestamp);
    }

    if (inserted === 0) return;

    // Build activity from actual commit timestamps, not import time
    const now = Date.now();
    const currentMonday = utcMondayOf(now);
    const activity =
      utcMondayOf(commitment.lastActivityAt) === currentMonday
        ? [...commitment.activity]
        : [0, 0, 0, 0, 0, 0, 0];

    for (const ts of insertedTimestamps) {
      if (utcMondayOf(ts) === currentMonday) {
        const slot = utcWeekday(ts);
        activity[slot] = (activity[slot] ?? 0) + 1;
      }
    }

    await ctx.db.patch(commitmentId, {
      lastActivityAt: now,
      activity,
    });

    await updateStreak(ctx, user);
  },
});

export const updateSyncBranch = internalMutation({
  args: { commitmentId: v.id("commitments"), branch: v.optional(v.string()) },
  handler: async (ctx, { commitmentId, branch }) => {
    const c = await ctx.db.get(commitmentId);
    if (c && c.initialSyncStatus === "syncing") {
      await ctx.db.patch(commitmentId, { syncCurrentBranch: branch ?? "default" });
    }
  },
});

export const markInitialSyncComplete = internalMutation({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    const c = await ctx.db.get(commitmentId);
    if (c && c.initialSyncStatus === "syncing") {
      await ctx.db.patch(commitmentId, {
        initialSyncStatus: "ready",
        syncCurrentBranch: undefined,
      });
    }
  },
});

/** Paginated backfill: fetches one page at a time, self-schedules for the next page/branch. */
export const backfillAllCommits = internalAction({
  args: {
    commitmentId: v.id("commitments"),
    repo: v.string(),
    page: v.optional(v.number()),
    branch: v.optional(v.string()),
    remainingBranches: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { commitmentId, repo, page, branch, remainingBranches }) => {
    const currentPage = page ?? 1;

    // Track which branch we're processing (only on first page of each branch)
    if (currentPage === 1) {
      await ctx.runMutation(internal.github.updateSyncBranch, { commitmentId, branch });
    }

    const data = await ctx.runQuery(internal.github.getCommitmentWithUser, { commitmentId });
    if (!data) return;

    const { user } = data;
    if (!user?.clerkUserId) return;

    const token = await fetchGitHubToken(user.clerkUserId);
    if (!token) return;

    const rawCommits = await fetchCommitPage(repo, token, currentPage, { sha: branch });

    // Rate limited — stop entirely
    if (!rawCommits) return;

    // No commits on this branch — try next branch
    if (rawCommits.length === 0) {
      if (remainingBranches && remainingBranches.length > 0) {
        await ctx.scheduler.runAfter(200, internal.github.backfillAllCommits, {
          commitmentId,
          repo,
          branch: remainingBranches[0],
          remainingBranches: remainingBranches.slice(1),
        });
      } else {
        // All branches done (last one was empty)
        await ctx.runMutation(internal.github.markInitialSyncComplete, { commitmentId });
      }
      return;
    }

    const commits = mapGitHubCommits(rawCommits, branch);

    await ctx.runMutation(internal.github.insertGitCommits, {
      commitmentId,
      userId: data.commitment.userId,
      commits,
    });

    if (rawCommits.length === 100) {
      // More pages on this branch
      await ctx.scheduler.runAfter(200, internal.github.backfillAllCommits, {
        commitmentId,
        repo,
        page: currentPage + 1,
        branch,
        remainingBranches,
      });
    } else if (remainingBranches && remainingBranches.length > 0) {
      // Branch done, move to next
      await ctx.scheduler.runAfter(200, internal.github.backfillAllCommits, {
        commitmentId,
        repo,
        branch: remainingBranches[0],
        remainingBranches: remainingBranches.slice(1),
      });
    } else {
      // All branches, all pages done — backfill complete
      await ctx.runMutation(internal.github.markInitialSyncComplete, { commitmentId });
    }
  },
});

export const registerWebhook = internalAction({
  args: {
    commitmentId: v.id("commitments"),
    repo: v.string(),
    skipBackfill: v.optional(v.boolean()),
  },
  handler: async (ctx, { commitmentId, repo, skipBackfill }) => {
    const data = await ctx.runQuery(internal.github.getCommitmentWithUser, { commitmentId });
    if (!data) return;

    const { user } = data;
    if (!user?.clerkUserId) {
      console.error("registerWebhook: user has no clerkUserId", { commitmentId });
      return;
    }

    const token = await fetchGitHubToken(user.clerkUserId);
    if (!token) {
      console.error("registerWebhook: could not get GitHub token", { commitmentId, repo });
      // Fallback: set lastPolledAt so polling cron picks this up efficiently
      await ctx.runMutation(internal.githubPolling.updateLastPolledAt, {
        commitmentIds: [commitmentId],
      });
      return;
    }

    if (!skipBackfill) {
      const branches = await fetchBranches(repo, token);
      // Schedule a single serialized backfill chain instead of parallel per-branch
      await ctx.scheduler.runAfter(0, internal.github.backfillAllCommits, {
        commitmentId,
        repo,
        branch: branches[0],
        remainingBranches: branches.slice(1),
      });
    }

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("registerWebhook: GITHUB_WEBHOOK_SECRET not set");
      await ctx.runMutation(internal.githubPolling.updateLastPolledAt, {
        commitmentIds: [commitmentId],
      });
      return;
    }

    const convexSiteUrl = process.env.CONVEX_SITE_URL;
    if (!convexSiteUrl) {
      console.error("registerWebhook: CONVEX_SITE_URL not set");
      await ctx.runMutation(internal.githubPolling.updateLastPolledAt, {
        commitmentIds: [commitmentId],
      });
      return;
    }

    const webhookUrl = `${convexSiteUrl}/github-webhook`;
    const headers = githubApiHeaders(token);

    const existingHookId = await findExistingHook(repo, webhookUrl, headers);
    if (existingHookId) {
      await ctx.runMutation(internal.github.storeWebhookId, {
        commitmentId,
        webhookId: existingHookId,
      });
      return;
    }

    const res = await fetch(`https://api.github.com/repos/${repo}/hooks`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: webhookUrl,
          content_type: "json",
          secret: webhookSecret,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Failed to register GitHub webhook:", { repo, status: res.status, body });
      // Fallback: ensure polling picks this up
      await ctx.runMutation(internal.githubPolling.updateLastPolledAt, {
        commitmentIds: [commitmentId],
      });
      return;
    }

    const hook = await res.json();
    await ctx.runMutation(internal.github.storeWebhookId, {
      commitmentId,
      webhookId: hook.id,
    });
  },
});

export const removeWebhook = internalAction({
  args: { commitmentId: v.id("commitments"), repo: v.string(), webhookId: v.number() },
  handler: async (ctx, { commitmentId, repo, webhookId }) => {
    await ctx.runMutation(internal.github.clearWebhookId, { commitmentId });

    // Only delete from GitHub if no other active commitments use this repo
    const others = await ctx.runQuery(internal.github.getCommitmentsByRepo, { repo });
    if (others.length > 0) return;

    const data = await ctx.runQuery(internal.github.getCommitmentWithUser, { commitmentId });
    if (!data) return;

    const { user } = data;
    if (!user?.clerkUserId) return;

    const token = await fetchGitHubToken(user.clerkUserId);
    if (!token) return;

    const res = await fetch(`https://api.github.com/repos/${repo}/hooks/${webhookId}`, {
      method: "DELETE",
      headers: githubApiHeaders(token),
    });

    if (!res.ok && res.status !== 404) {
      console.error("Failed to remove GitHub webhook:", { repo, status: res.status });
    }
  },
});

/** Check if the user's GitHub token has the admin:repo_hook scope. */
export const checkWebhookScope = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.users.getByTokenIdentifier, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user?.clerkUserId) throw new Error("GitHub account not linked");

    const token = await fetchGitHubToken(user.clerkUserId);
    if (!token) throw new Error("Could not get GitHub token");

    const res = await fetch("https://api.github.com/", {
      headers: githubApiHeaders(token),
    });
    const scopeHeader = res.headers.get("X-OAuth-Scopes") ?? "";
    const scopes = scopeHeader.split(",").map((s) => s.trim());
    return { hasScope: scopes.includes("admin:repo_hook") };
  },
});

/** Delete a webhook from GitHub if no active commitment still references it. */
export const deleteRepoWebhook = internalAction({
  args: { repo: v.string(), webhookId: v.number(), clerkUserId: v.string() },
  handler: async (ctx, { repo, webhookId, clerkUserId }) => {
    const active = await ctx.runQuery(internal.github.getCommitmentsByRepo, { repo });
    if (active.some((c) => c.webhookId)) return;

    const token = await fetchGitHubToken(clerkUserId);
    if (!token) return;

    const res = await fetch(`https://api.github.com/repos/${repo}/hooks/${webhookId}`, {
      method: "DELETE",
      headers: githubApiHeaders(token),
    });

    if (!res.ok && res.status !== 404) {
      console.error("Failed to remove GitHub webhook:", { repo, status: res.status });
    }
  },
});

export const patchRepoPrivacy = internalMutation({
  args: { commitmentId: v.id("commitments"), isPrivate: v.boolean() },
  handler: async (ctx, { commitmentId, isPrivate }) => {
    const commitment = await ctx.db.get(commitmentId);
    if (commitment && commitment.isPrivate !== isPrivate) {
      await ctx.db.patch(commitmentId, { isPrivate });
    }
  },
});

export const checkRepoPrivacy = internalAction({
  args: { commitmentId: v.id("commitments"), repo: v.string(), clerkUserId: v.string() },
  handler: async (ctx, { commitmentId, repo, clerkUserId }) => {
    const token = await fetchGitHubToken(clerkUserId);
    if (!token) return;

    const isPrivate = await isRepositoryPrivate(repo, token);
    await ctx.runMutation(internal.github.patchRepoPrivacy, { commitmentId, isPrivate });
  },
});

/** Manual sync — callable from the frontend. Returns count of new commits found. */
export const triggerSync = action({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const data = await ctx.runQuery(internal.github.getCommitmentWithUser, { commitmentId });
    if (!data) throw new Error("Commitment not found");

    const { commitment, user } = data;
    if (!user || user.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Not the owner");
    }
    if (!commitment.repo) throw new Error("No repo connected");
    if (!user.clerkUserId) throw new Error("GitHub account not linked");

    const token = await fetchGitHubToken(user.clerkUserId);
    if (!token) throw new Error("Could not get GitHub token — try re-logging in");

    // Use the latest commit timestamp from DB, not lastPolledAt.
    // lastPolledAt can be ahead if a backfill was scheduled but failed partway.
    const latestCommitTime = await ctx.runQuery(internal.github.getLatestCommitTime, {
      commitmentId,
    });
    const since = latestCommitTime ? new Date(latestCommitTime).toISOString() : undefined;

    const rawCommits = await fetchNewCommitsAllBranches(commitment.repo, token, since);
    if (rawCommits.length > 0) {
      const commits = mapGitHubCommits(rawCommits);
      await ctx.runMutation(internal.github.insertGitCommits, {
        commitmentId,
        userId: commitment.userId,
        commits,
      });
    }

    await ctx.runMutation(internal.githubPolling.updateLastPolledAt, {
      commitmentIds: [commitmentId],
    });

    // Manual sync implies the commitment is ready to show
    await ctx.runMutation(internal.github.markInitialSyncComplete, { commitmentId });

    return { newCommits: rawCommits.length };
  },
});
