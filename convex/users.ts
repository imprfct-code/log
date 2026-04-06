import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";

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
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
  },
  handler: async (ctx, { userId, username, avatarUrl, githubUsername }) => {
    await ctx.db.patch(userId, {
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

export const updateProfile = mutation({
  args: {
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const updates: Record<string, string> = {};
    if (args.username !== undefined) updates.username = args.username;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.githubUsername !== undefined) updates.githubUsername = args.githubUsername;

    await ctx.db.patch(user._id, updates);
  },
});
