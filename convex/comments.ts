import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserByToken } from "./users";
import { attachmentValidator } from "./schema";
import { resolveAttachments } from "./devlog";
import { r2 } from "./r2";

const MAX_COMMENT_ATTACHMENTS = 2;

export const create = mutation({
  args: {
    commitmentId: v.id("commitments"),
    devlogEntryId: v.optional(v.id("devlogEntries")),
    text: v.string(),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  handler: async (ctx, { commitmentId, devlogEntryId, text, attachments }) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const trimmed = text.trim();
    const hasAttachments = attachments && attachments.length > 0;
    if (!trimmed && !hasAttachments) throw new Error("Comment cannot be empty");

    if (attachments && attachments.length > MAX_COMMENT_ATTACHMENTS) {
      throw new Error(`Comments support up to ${MAX_COMMENT_ATTACHMENTS} attachments`);
    }

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
      text: trimmed,
      attachments,
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

    // Clean up R2 attachments (best-effort)
    for (const att of comment.attachments ?? []) {
      try {
        await r2.deleteObject(ctx, att.key);
      } catch (err) {
        console.error("Failed to delete R2 object during comment remove", { key: att.key, err });
      }
    }

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

export const update = mutation({
  args: {
    id: v.id("comments"),
    text: v.string(),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  handler: async (ctx, { id, text, attachments }) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const comment = await ctx.db.get(id);
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== user._id) throw new Error("Not the owner");

    const trimmed = text.trim();
    const hasAttachments = attachments
      ? attachments.length > 0
      : (comment.attachments ?? []).length > 0;
    if (!trimmed && !hasAttachments) throw new Error("Text cannot be empty");

    if (attachments && attachments.length > MAX_COMMENT_ATTACHMENTS) {
      throw new Error(`Comments support up to ${MAX_COMMENT_ATTACHMENTS} attachments`);
    }

    // Delete removed attachments from R2 (best-effort)
    if (attachments !== undefined) {
      const oldKeys = new Set((comment.attachments ?? []).map((a) => a.key));
      const newKeys = new Set(attachments.map((a) => a.key));
      for (const oldKey of oldKeys) {
        if (!newKeys.has(oldKey)) {
          try {
            await r2.deleteObject(ctx, oldKey);
          } catch (err) {
            console.error("Failed to delete R2 object during comment update", {
              key: oldKey,
              err,
            });
          }
        }
      }
    }

    const patch: { text: string; attachments?: typeof attachments } = { text: trimmed };
    if (attachments !== undefined) {
      patch.attachments = attachments;
    }
    await ctx.db.patch(id, patch);
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
          attachments: await resolveAttachments(comment.attachments),
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
          attachments: await resolveAttachments(comment.attachments),
        };
      }),
    );
  },
});
