import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { DAY_MS, utcWeekday, utcMondayOf } from "./dates";
import { getUserByToken, updateStreak } from "./users";
import { computeVisibility, redactEntry } from "./privacy";
import { attachmentValidator } from "./schema";
import { r2 } from "./r2";

const MAX_CONTENT_LENGTH = 20_000;

/** Update weekly activity array (Mon=0, Sun=6). Resets on new week. */
export function updateActivity(current: number[], lastActivityAt: number): number[] {
  const now = Date.now();
  const sameWeek = utcMondayOf(now) === utcMondayOf(lastActivityAt);
  const activity = sameWeek ? [...current] : [0, 0, 0, 0, 0, 0, 0];
  const slot = utcWeekday(now);
  activity[slot] = (activity[slot] ?? 0) + 1;
  return activity;
}

/** Extract first line (max 100 chars) from content for feed preview. Strips markdown heading prefix and inline media refs. */
export function extractTitle(content: string): string {
  const firstLine = content
    .split("\n")[0]
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/!\[[^\]]*?\]\([^)]+\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return firstLine.length > 100 ? firstLine.slice(0, 100) + "\u2026" : firstLine;
}

/** Resolve R2 attachment keys to signed URLs. */
export async function resolveAttachments(
  attachments?: Array<{
    key: string;
    type: "image" | "video";
    filename: string;
    inline?: boolean;
    cover?: boolean;
    duration?: number;
  }>,
): Promise<
  Array<{
    url: string;
    key: string;
    type: "image" | "video";
    filename: string;
    inline: boolean;
    cover?: boolean;
    duration?: number;
  }>
> {
  if (!attachments?.length) return [];
  return Promise.all(
    attachments.map(async (att) => ({
      url: await r2.getUrl(att.key, { expiresIn: 60 * 60 * 24 }),
      key: att.key,
      type: att.type,
      filename: att.filename,
      inline: att.inline ?? false,
      cover: att.cover,
      duration: att.duration,
    })),
  );
}

export const getFileUrl = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");
    return r2.getUrl(key, { expiresIn: 60 * 60 * 24 });
  },
});

export const create = mutation({
  // Posts: use `content` (auto-splits into text/body). Commits: use `text` + `body`.
  args: {
    commitmentId: v.id("commitments"),
    type: v.union(v.literal("commit"), v.literal("post")),
    text: v.optional(v.string()),
    content: v.optional(v.string()),
    body: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    hash: v.optional(v.string()),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment) throw new Error("Commitment not found");
    if (commitment.userId !== user._id) throw new Error("Not the owner");
    if (commitment.status !== "building") throw new Error("Cannot post to shipped commitment");

    const now = Date.now();
    let text: string;
    let body: string | undefined;

    if (args.type === "post") {
      const content = args.content?.trim();
      if (content && content.length > MAX_CONTENT_LENGTH) {
        throw new Error(`Content too long (max ${MAX_CONTENT_LENGTH} characters)`);
      }
      const hasAttachments = args.attachments && args.attachments.length > 0;
      if (!content && !hasAttachments) throw new Error("Post cannot be empty");
      text = (content && extractTitle(content)) || "media update";
      body = content || undefined;
    } else {
      if (!args.text) throw new Error("Text is required");
      text = args.text;
      body = args.body;
    }

    const entryId = await ctx.db.insert("devlogEntries", {
      commitmentId: args.commitmentId,
      userId: user._id,
      type: args.type,
      text,
      body,
      imageStorageId: args.imageStorageId,
      attachments: args.attachments,
      hash: args.hash,
      committedAt: now,
      commentCount: 0,
    });

    await ctx.db.patch(args.commitmentId, {
      lastActivityAt: now,
      activity: updateActivity(commitment.activity, commitment.lastActivityAt),
    });

    await updateStreak(ctx, user);

    return entryId;
  },
});

export const update = mutation({
  args: {
    entryId: v.id("devlogEntries"),
    content: v.optional(v.string()),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.userId !== user._id) throw new Error("Not the owner");
    if (entry.type !== "post") throw new Error("Can only edit posts");

    // Use provided values or fall back to existing entry values
    if (args.content !== undefined && args.content.trim().length > MAX_CONTENT_LENGTH) {
      throw new Error(`Content too long (max ${MAX_CONTENT_LENGTH} characters)`);
    }
    const trimmedContent = args.content !== undefined ? args.content.trim() : entry.body;
    const effectiveAttachments =
      args.attachments !== undefined ? args.attachments : (entry.attachments ?? []);
    if (!trimmedContent && effectiveAttachments.length === 0) {
      throw new Error("Post cannot be empty");
    }

    // Delete removed attachments from R2
    if (args.attachments !== undefined) {
      const oldKeys = new Set((entry.attachments ?? []).map((a) => a.key));
      const newKeys = new Set(args.attachments.map((a) => a.key));
      for (const oldKey of oldKeys) {
        if (!newKeys.has(oldKey)) {
          await r2.deleteObject(ctx, oldKey);
        }
      }
    }

    const patch: Partial<Pick<Doc<"devlogEntries">, "text" | "body" | "attachments">> = {};
    if (args.content !== undefined) {
      const content = args.content.trim();
      patch.text = content ? extractTitle(content) : "media update";
      patch.body = content || undefined;
    }
    if (args.attachments !== undefined) {
      patch.attachments = args.attachments;
    }

    await ctx.db.patch(args.entryId, patch);
  },
});

export const remove = mutation({
  args: { entryId: v.id("devlogEntries") },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.userId !== user._id) throw new Error("Not the owner");
    if (entry.type !== "post") throw new Error("Can only delete posts");

    // Delete attachments from R2
    for (const att of entry.attachments ?? []) {
      await r2.deleteObject(ctx, att.key);
    }

    // Delete associated comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_devlogEntryId", (q) => q.eq("devlogEntryId", args.entryId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Update commitment: decrement activity + comment count in one fetch
    const commitment = await ctx.db.get(entry.commitmentId);
    if (commitment) {
      const patch: { activity?: number[]; commentCount?: number } = {};

      const entryTs = entry.committedAt ?? entry._creationTime;
      if (utcMondayOf(entryTs) === utcMondayOf(Date.now())) {
        const activity = [...commitment.activity];
        const slot = utcWeekday(entryTs);
        activity[slot] = Math.max(0, (activity[slot] ?? 0) - 1);
        patch.activity = activity;
      }

      if (comments.length > 0) {
        patch.commentCount = Math.max(0, commitment.commentCount - comments.length);
      }

      if (patch.activity !== undefined || patch.commentCount !== undefined) {
        await ctx.db.patch(entry.commitmentId, patch);
      }
    }

    await ctx.db.delete(args.entryId);
  },
});

export const listByCommitment = query({
  args: {
    commitmentId: v.id("commitments"),
    viewAsGuest: v.optional(v.boolean()),
  },
  handler: async (ctx, { commitmentId, viewAsGuest }) => {
    const commitment = await ctx.db.get(commitmentId);
    if (!commitment) return [];

    const owner = await ctx.db.get(commitment.userId);
    const viewer = await getUserByToken(ctx);
    const isAuthor = viewer !== null && viewer._id === commitment.userId;
    const effectiveAuthor = isAuthor && !viewAsGuest;
    const flags = computeVisibility({
      isPrivate: commitment.isPrivate,
      ownerPrefs: owner ?? undefined,
      isAuthor: effectiveAuthor,
    });

    // committedAt is set on all new entries. Old entries without it sort last (desc order).
    const entries = await ctx.db
      .query("devlogEntries")
      .withIndex("by_commitmentId_and_committedAt", (q) => q.eq("commitmentId", commitmentId))
      .order("desc")
      .take(200);

    return Promise.all(
      entries.map(async (e) => {
        const redacted = redactEntry(e, flags, commitment.isPrivate, effectiveAuthor);
        return {
          ...redacted,
          resolvedAttachments: await resolveAttachments(e.attachments),
        };
      }),
    );
  },
});

export const listByUser = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const viewer = await getUserByToken(ctx);
    const owner = await ctx.db.get(userId);

    const entries = await ctx.db
      .query("devlogEntries")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 10);

    const isAuthor = viewer !== null && viewer._id === userId;

    return await Promise.all(
      entries.map(async (entry) => {
        const commitment = await ctx.db.get(entry.commitmentId);
        const flags = computeVisibility({
          isPrivate: commitment?.isPrivate,
          ownerPrefs: owner ?? undefined,
          isAuthor,
        });
        const redacted = redactEntry(entry, flags, commitment?.isPrivate, isAuthor);
        return {
          ...redacted,
          commitmentTitle: commitment?.text ?? "",
          resolvedAttachments: await resolveAttachments(entry.attachments),
        };
      }),
    );
  },
});

export const getActivityForHeatmap = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const oneYearAgo = Date.now() - 365 * DAY_MS;

    const dayMap: Record<string, { commits: number; posts: number }> = {};
    const entriesQuery = ctx.db
      .query("devlogEntries")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc");

    for await (const entry of entriesQuery) {
      if (entry._creationTime < oneYearAgo) break;
      const date = new Date(entry._creationTime).toISOString().slice(0, 10);
      if (!dayMap[date]) dayMap[date] = { commits: 0, posts: 0 };
      if (entry.type === "commit" || entry.type === "git_commit") dayMap[date].commits++;
      else dayMap[date].posts++;
    }

    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", userId).eq("status", "shipped"))
      .take(50);

    const shippedDates = new Set(
      commitments
        .filter((c) => c.shippedAt && c.shippedAt >= oneYearAgo)
        .map((c) => new Date(c.shippedAt!).toISOString().slice(0, 10)),
    );

    const days: { date: string; commits: number; posts: number; shipped: boolean }[] = [];
    const now = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const activity = dayMap[date] ?? { commits: 0, posts: 0 };
      days.push({ date, ...activity, shipped: shippedDates.has(date) });
    }

    return days;
  },
});

export const getById = query({
  args: { id: v.id("devlogEntries") },
  handler: async (ctx, { id }) => {
    const entry = await ctx.db.get(id);
    if (!entry) return null;
    if (entry.type !== "post") return null;

    const user = await ctx.db.get(entry.userId);
    const commitment = await ctx.db.get(entry.commitmentId);
    const viewer = await getUserByToken(ctx);
    const isOwn = viewer !== null && viewer._id === entry.userId;

    // Privacy: posts are never redacted (see redactEntry), but apply for consistency
    const flags = computeVisibility({
      isPrivate: commitment?.isPrivate,
      ownerPrefs: user ?? undefined,
      isAuthor: isOwn,
    });
    const redacted = redactEntry(entry, flags, commitment?.isPrivate, isOwn);

    return {
      ...redacted,
      resolvedAttachments: await resolveAttachments(entry.attachments),
      author: user ? { username: user.username, avatarUrl: user.avatarUrl } : null,
      commitment: commitment
        ? { _id: commitment._id, text: commitment.text, status: commitment.status }
        : null,
      isOwn,
    };
  },
});
