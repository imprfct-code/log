import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const fetchAndUpdateProfile = internalAction({
  args: { userId: v.id("users"), clerkUserId: v.string() },
  handler: async (ctx, { userId, clerkUserId }) => {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) return;

    const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!res.ok) {
      console.error("Clerk API error:", res.status, await res.text());
      return;
    }

    const data = await res.json();

    const ghAccount = data.external_accounts?.find(
      (a: { provider: string }) => a.provider === "oauth_github",
    );

    const username = ghAccount?.username ?? data.username ?? "user";
    const avatarUrl = data.image_url ?? ghAccount?.avatar_url ?? undefined;
    const githubUsername = ghAccount?.username ?? undefined;

    await ctx.runMutation(internal.users.updateFromClerk, {
      userId,
      username,
      avatarUrl,
      githubUsername,
    });
  },
});
