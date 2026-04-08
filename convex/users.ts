import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { DAY_MS, utcDateString } from "./dates";

export async function updateStreak(ctx: MutationCtx, user: Doc<"users">) {
  const today = utcDateString();
  if (user.lastActiveDate === today) return;
  const yesterday = utcDateString(new Date(Date.now() - DAY_MS));
  const isConsecutive = user.lastActiveDate === yesterday;
  await ctx.db.patch(user._id, {
    streak: isConsecutive ? user.streak + 1 : 1,
    lastActiveDate: today,
  });
}

export async function getUserByToken(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    return await getUserByToken(ctx);
  },
});

export const updateFromClerk = internalMutation({
  args: {
    userId: v.id("users"),
    clerkUserId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
  },
  handler: async (ctx, { userId, clerkUserId, username, avatarUrl, githubUsername }) => {
    await ctx.db.patch(userId, {
      clerkUserId,
      username,
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(githubUsername !== undefined && { githubUsername }),
    });
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
  },
});

export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) {
      // Re-sync profile on every login so avatar/username stay fresh
      await ctx.scheduler.runAfter(0, internal.clerkSync.fetchAndUpdateProfile, {
        userId: existing._id,
        clerkUserId: identity.subject,
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      username: identity.nickname ?? identity.name?.toLowerCase().replace(/\s+/g, "") ?? "user",
      avatarUrl: identity.pictureUrl,
      streak: 0,
    });

    await ctx.scheduler.runAfter(0, internal.clerkSync.fetchAndUpdateProfile, {
      userId,
      clerkUserId: identity.subject,
    });

    return userId;
  },
});

export const getByTokenIdentifier = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();
  },
});

export const updateSyncMode = mutation({
  args: { syncMode: v.union(v.literal("polling"), v.literal("webhook")) },
  handler: async (ctx, { syncMode }) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const previousMode = user.syncMode ?? "polling";
    await ctx.db.patch(user._id, { syncMode });

    if (previousMode === syncMode) return;

    // Migrate all active commitments to the new sync mode
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", user._id).eq("status", "building"))
      .collect();

    const now = Date.now();
    const seenRepos = new Set<string>();

    for (const c of commitments) {
      if (!c.repo) continue;

      if (syncMode === "webhook" && !c.webhookId) {
        await ctx.scheduler.runAfter(0, internal.github.registerWebhook, {
          commitmentId: c._id,
          repo: c.repo,
          skipBackfill: true,
        });
      } else if (syncMode === "polling" && c.webhookId) {
        await ctx.db.patch(c._id, { webhookId: undefined, lastPolledAt: now });

        if (!seenRepos.has(c.repo) && user.clerkUserId) {
          seenRepos.add(c.repo);
          await ctx.scheduler.runAfter(0, internal.github.deleteRepoWebhook, {
            repo: c.repo,
            webhookId: c.webhookId,
            clerkUserId: user.clerkUserId,
          });
        }
      }
    }
  },
});

export const updatePrivacySettings = mutation({
  args: {
    privateShowMessages: v.optional(v.boolean()),
    privateShowHashes: v.optional(v.boolean()),
    privateShowBranches: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.patch(user._id, args);
  },
});

export const updateProfile = mutation({
  args: {
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.patch(user._id, {
      ...(args.username !== undefined && { username: args.username }),
      ...(args.bio !== undefined && { bio: args.bio }),
      ...(args.githubUsername !== undefined && { githubUsername: args.githubUsername }),
    });
  },
});
