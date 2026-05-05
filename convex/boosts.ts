import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserByToken } from "./users";

export const toggle = mutation({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const commitment = await ctx.db.get(commitmentId);
    if (!commitment) throw new Error("Commitment not found");
    if (commitment.status !== "shipped") throw new Error("Can only boost shipped commitments");

    const existing = await ctx.db
      .query("boosts")
      .withIndex("by_userId_and_commitmentId", (q) =>
        q.eq("userId", user._id).eq("commitmentId", commitmentId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(commitmentId, {
        boostCount: Math.max(0, commitment.boostCount - 1),
      });
      return { boosted: false };
    }

    await ctx.db.insert("boosts", { userId: user._id, commitmentId });
    await ctx.db.patch(commitmentId, { boostCount: commitment.boostCount + 1 });
    return { boosted: true };
  },
});

export const hasBoosted = query({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    const user = await getUserByToken(ctx);
    if (!user) return false;

    const existing = await ctx.db
      .query("boosts")
      .withIndex("by_userId_and_commitmentId", (q) =>
        q.eq("userId", user._id).eq("commitmentId", commitmentId),
      )
      .unique();

    return existing !== null;
  },
});
