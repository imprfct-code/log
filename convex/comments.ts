import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserByToken } from "./users";

export const create = mutation({
  args: {
    commitmentId: v.id("commitments"),
    devlogEntryId: v.optional(v.id("devlogEntries")),
    text: v.string(),
  },
  handler: async (ctx, { commitmentId, devlogEntryId, text }) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const commitment = await ctx.db.get(commitmentId);
    if (!commitment) throw new Error("Commitment not found");

    if (devlogEntryId) {
      const entry = await ctx.db.get(devlogEntryId);
      if (!entry || entry.commitmentId !== commitmentId) {
        throw new Error("Devlog entry not found");
      }
      await ctx.db.patch(devlogEntryId, { commentCount: entry.commentCount + 1 });
    }

    await ctx.db.patch(commitmentId, { commentCount: commitment.commentCount + 1 });

    return await ctx.db.insert("comments", {
      userId: user._id,
      commitmentId,
      devlogEntryId,
      text,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, { id }) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const comment = await ctx.db.get(id);
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== user._id) throw new Error("Not the owner");

    const commitment = await ctx.db.get(comment.commitmentId);
    if (commitment) {
      await ctx.db.patch(comment.commitmentId, {
        commentCount: Math.max(0, commitment.commentCount - 1),
      });
    }

    if (comment.devlogEntryId) {
      const entry = await ctx.db.get(comment.devlogEntryId);
      if (entry) {
        await ctx.db.patch(comment.devlogEntryId, {
          commentCount: Math.max(0, entry.commentCount - 1),
        });
      }
    }

    await ctx.db.delete(id);
  },
});

export const listByCommitment = query({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitmentId))
      .order("asc")
      .take(200);

    return await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          username: user?.username ?? "unknown",
          avatarUrl: user?.avatarUrl,
        };
      }),
    );
  },
});

export const listByDevlogEntry = query({
  args: { devlogEntryId: v.id("devlogEntries") },
  handler: async (ctx, { devlogEntryId }) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_devlogEntryId", (q) => q.eq("devlogEntryId", devlogEntryId))
      .order("asc")
      .take(200);

    return await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          username: user?.username ?? "unknown",
          avatarUrl: user?.avatarUrl,
        };
      }),
    );
  },
});
