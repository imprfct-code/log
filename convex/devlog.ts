import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DAY_MS, utcDateString } from "./dates";
import { getUserByToken } from "./users";

/** Shift activity array to account for days passed, then increment today. */
function updateActivity(current: number[], lastActivityAt: number): number[] {
  const now = Date.now();
  const daysSinceLast = Math.floor((now - lastActivityAt) / 86_400_000);
  const shifted = daysSinceLast >= 7 ? [0, 0, 0, 0, 0, 0, 0] : [...current];

  // Shift left by days elapsed
  for (let i = 0; i < daysSinceLast && i < 7; i++) {
    shifted.shift();
    shifted.push(0);
  }

  // Increment today
  shifted[6] = (shifted[6] ?? 0) + 1;
  return shifted;
}

export const create = mutation({
  args: {
    commitmentId: v.id("commitments"),
    type: v.union(v.literal("commit"), v.literal("post")),
    text: v.string(),
    body: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    hash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment) throw new Error("Commitment not found");
    if (commitment.userId !== user._id) throw new Error("Not the owner");

    // Insert entry
    const entryId = await ctx.db.insert("devlogEntries", {
      commitmentId: args.commitmentId,
      userId: user._id,
      type: args.type,
      text: args.text,
      body: args.body,
      imageStorageId: args.imageStorageId,
      hash: args.hash,
      commentCount: 0,
    });

    // Update commitment activity + lastActivityAt
    const now = Date.now();
    await ctx.db.patch(args.commitmentId, {
      lastActivityAt: now,
      activity: updateActivity(commitment.activity, commitment.lastActivityAt),
    });

    // Update user streak (UTC-based — consistent across all users)
    const today = utcDateString();
    if (user.lastActiveDate !== today) {
      const yesterday = utcDateString(new Date(Date.now() - DAY_MS));
      const isConsecutive = user.lastActiveDate === yesterday;
      await ctx.db.patch(user._id, {
        streak: isConsecutive ? user.streak + 1 : 1,
        lastActiveDate: today,
      });
    }

    return entryId;
  },
});

export const listByCommitment = query({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    return await ctx.db
      .query("devlogEntries")
      .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitmentId))
      .order("desc")
      .take(100);
  },
});

export const listByUser = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const entries = await ctx.db
      .query("devlogEntries")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 10);

    // Attach commitment title for profile activity display
    return await Promise.all(
      entries.map(async (entry) => {
        const commitment = await ctx.db.get(entry.commitmentId);
        return {
          ...entry,
          commitmentTitle: commitment?.text ?? "",
        };
      }),
    );
  },
});

export const getActivityForHeatmap = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const oneYearAgo = Date.now() - 365 * DAY_MS;

    // Stream entries, stopping at year boundary (no arbitrary limit)
    const dayMap: Record<string, { commits: number; posts: number }> = {};
    const entriesQuery = ctx.db
      .query("devlogEntries")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc");

    for await (const entry of entriesQuery) {
      if (entry._creationTime < oneYearAgo) break;
      const date = new Date(entry._creationTime).toISOString().slice(0, 10);
      if (!dayMap[date]) dayMap[date] = { commits: 0, posts: 0 };
      if (entry.type === "commit") dayMap[date].commits++;
      else dayMap[date].posts++;
    }

    // Get shipped dates from commitments
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", userId).eq("status", "shipped"))
      .take(50);

    const shippedDates = new Set(
      commitments
        .filter((c) => c.shippedAt && c.shippedAt >= oneYearAgo)
        .map((c) => new Date(c.shippedAt!).toISOString().slice(0, 10)),
    );

    // Build array of days
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
