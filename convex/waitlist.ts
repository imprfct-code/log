import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const join = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) return { alreadyJoined: true };
    await ctx.db.insert("waitlist", { email });
    return { alreadyJoined: false };
  },
});
