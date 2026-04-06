import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";

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

    if (existing) return existing._id;

    const username =
      identity.nickname ?? identity.name?.toLowerCase().replace(/\s+/g, "") ?? "user";

    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      username,
      avatarUrl: identity.pictureUrl,
      streak: 0,
    });
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
