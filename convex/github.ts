import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { updateActivity } from "./devlog";
import { DAY_MS, utcDateString } from "./dates";

// --- Queries ---

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

// --- Mutations ---

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
    for (const commit of commits) {
      // Dedup: check if we already have this SHA for this commitment
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
        committedAt: commit.timestamp,
        commentCount: 0,
      });
      inserted++;
    }

    if (inserted === 0) return;

    // Update commitment activity + lastActivityAt
    const now = Date.now();
    await ctx.db.patch(commitmentId, {
      lastActivityAt: now,
      activity: updateActivity(commitment.activity, commitment.lastActivityAt),
    });

    // Update user streak
    const today = utcDateString();
    if (user.lastActiveDate !== today) {
      const yesterday = utcDateString(new Date(Date.now() - DAY_MS));
      const isConsecutive = user.lastActiveDate === yesterday;
      await ctx.db.patch(userId, {
        streak: isConsecutive ? user.streak + 1 : 1,
        lastActiveDate: today,
      });
    }
  },
});

// --- Actions ---

async function fetchGitHubToken(clerkUserId: string): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;

  const res = await fetch(
    `https://api.clerk.com/v1/users/${clerkUserId}/oauth_access_tokens/oauth_github`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );

  if (!res.ok) {
    console.error("Failed to fetch GitHub token from Clerk:", res.status);
    return null;
  }

  const data = await res.json();
  // Clerk returns an array of tokens; take the first one
  const token = data?.[0]?.token;
  return token ?? null;
}

/** Check if a webhook with our URL already exists on this repo (prevents duplicates on retry). */
async function findExistingHook(
  repo: string,
  webhookUrl: string,
  headers: Record<string, string>,
): Promise<number | null> {
  const res = await fetch(`https://api.github.com/repos/${repo}/hooks`, { headers });
  if (!res.ok) return null;

  const hooks: Array<{ id: number; config: { url?: string } }> = await res.json();
  const match = hooks.find((h) => h.config.url === webhookUrl);
  return match?.id ?? null;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
  html_url: string;
  author: { login: string } | null;
}

/** Fetch existing commits from GitHub API and insert them as devlog entries. */
async function backfillCommits(
  ctx: ActionCtx,
  opts: {
    repo: string;
    token: string;
    commitmentId: Id<"commitments">;
    userId: Id<"users">;
  },
) {
  const { repo, token, commitmentId, userId } = opts;

  // Fetch up to 100 most recent commits from the default branch
  const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    console.error("backfillCommits: failed to fetch commits", { repo, status: res.status });
    return;
  }

  const data: GitHubCommit[] = await res.json();
  if (data.length === 0) return;

  const commits = data.map((c) => ({
    sha: c.sha,
    message: c.commit.message.split("\n")[0],
    author: c.commit.author?.name || c.author?.login || "unknown",
    url: c.html_url,
    timestamp: new Date(c.commit.author?.date ?? Date.now()).getTime(),
  }));

  await ctx.runMutation(internal.github.insertGitCommits, {
    commitmentId,
    userId,
    commits,
  });
}

export const registerWebhook = internalAction({
  args: { commitmentId: v.id("commitments"), repo: v.string() },
  handler: async (ctx, { commitmentId, repo }) => {
    const data = await ctx.runQuery(internal.github.getCommitmentWithUser, { commitmentId });
    if (!data) return;

    const { commitment, user } = data;
    if (!user?.clerkUserId) {
      console.error("registerWebhook: user has no clerkUserId", { commitmentId });
      return;
    }

    const token = await fetchGitHubToken(user.clerkUserId);
    if (!token) {
      console.error("registerWebhook: could not get GitHub token", { commitmentId, repo });
      return;
    }

    // 1. Backfill existing commits first
    await backfillCommits(ctx, {
      repo,
      token,
      commitmentId,
      userId: commitment.userId,
    });

    // 2. Register webhook for future pushes
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("registerWebhook: GITHUB_WEBHOOK_SECRET not set");
      return;
    }

    const convexSiteUrl = process.env.CONVEX_SITE_URL;
    if (!convexSiteUrl) {
      console.error("registerWebhook: CONVEX_SITE_URL not set");
      return;
    }

    const webhookUrl = `${convexSiteUrl}/github-webhook`;
    const githubHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Check for existing webhook with our URL (prevents duplicates on retry)
    const existingHookId = await findExistingHook(repo, webhookUrl, githubHeaders);
    if (existingHookId) {
      await ctx.runMutation(internal.github.storeWebhookId, {
        commitmentId,
        webhookId: existingHookId,
      });
      return;
    }

    const res = await fetch(`https://api.github.com/repos/${repo}/hooks`, {
      method: "POST",
      headers: { ...githubHeaders, "Content-Type": "application/json" },
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
    // Clear the webhookId on this commitment first
    await ctx.runMutation(internal.github.clearWebhookId, { commitmentId });

    // Only delete the webhook from GitHub if no other active commitments use this repo
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
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!res.ok && res.status !== 404) {
      console.error("Failed to remove GitHub webhook:", res.status);
    }
  },
});
