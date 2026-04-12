import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { r2 } from "./r2";

interface WebhookInfo {
  repo: string;
  webhookId: number;
}

/** Delete all DB data + R2 files for a user. Returns info needed for external cleanup. */
export const deleteAccountData = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const webhooks: WebhookInfo[] = [];

    // 1. Delete user's commitments and all nested data
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", userId))
      .collect();

    for (const commitment of commitments) {
      // Delete comments on this commitment
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitment._id))
        .collect();
      for (const c of comments) {
        for (const att of c.attachments ?? []) {
          try {
            await r2.deleteObject(ctx, att.key);
          } catch (err) {
            console.error("R2 delete failed (comment attachment)", { key: att.key, err });
          }
        }
        await ctx.db.delete(c._id);
      }

      // Delete boosts on this commitment
      const boosts = await ctx.db
        .query("boosts")
        .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitment._id))
        .collect();
      for (const b of boosts) {
        await ctx.db.delete(b._id);
      }

      // Delete devlog entries (with R2 cleanup)
      const entries = await ctx.db
        .query("devlogEntries")
        .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitment._id))
        .collect();
      for (const e of entries) {
        for (const att of e.attachments ?? []) {
          try {
            await r2.deleteObject(ctx, att.key);
          } catch (err) {
            console.error("R2 delete failed (entry attachment)", { key: att.key, err });
          }
        }
        await ctx.db.delete(e._id);
      }

      // Collect webhook info for external cleanup
      if (commitment.repo && commitment.webhookId) {
        webhooks.push({ repo: commitment.repo, webhookId: commitment.webhookId });
      }

      await ctx.db.delete(commitment._id);
    }

    // 2. Delete comments the user left on OTHER people's commitments
    const externalComments = await ctx.db
      .query("comments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const c of externalComments) {
      // Decrement commentCount on the commitment
      const commitment = await ctx.db.get(c.commitmentId);
      if (commitment) {
        await ctx.db.patch(c.commitmentId, {
          commentCount: Math.max(0, commitment.commentCount - 1),
        });
      }

      // Decrement commentCount on the devlog entry
      if (c.devlogEntryId) {
        const entry = await ctx.db.get(c.devlogEntryId);
        if (entry) {
          await ctx.db.patch(c.devlogEntryId, {
            commentCount: Math.max(0, entry.commentCount - 1),
          });
        }
      }

      // Clean up R2 attachments
      for (const att of c.attachments ?? []) {
        try {
          await r2.deleteObject(ctx, att.key);
        } catch (err) {
          console.error("R2 delete failed (external comment attachment)", { key: att.key, err });
        }
      }

      await ctx.db.delete(c._id);
    }

    // 3. Delete boosts the user gave to other people's commitments
    const externalBoosts = await ctx.db
      .query("boosts")
      .withIndex("by_userId_and_commitmentId", (q) => q.eq("userId", userId))
      .collect();

    for (const b of externalBoosts) {
      const commitment = await ctx.db.get(b.commitmentId);
      if (commitment) {
        await ctx.db.patch(b.commitmentId, {
          boostCount: Math.max(0, commitment.boostCount - 1),
        });
      }
      await ctx.db.delete(b._id);
    }

    // 4. Delete user record
    const clerkUserId = user.clerkUserId;
    await ctx.db.delete(userId);

    return { webhooks, clerkUserId: clerkUserId ?? null };
  },
});

/** Public action: permanently delete the authenticated user's account and all data. */
export const deleteAccount = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.users.getByTokenIdentifier, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    // 1. Delete all DB data + R2 files
    const { webhooks, clerkUserId } = await ctx.runMutation(
      internal.accountDeletion.deleteAccountData,
      { userId: user._id },
    );

    // 2. Clean up GitHub webhooks (best-effort, needs Clerk user to still exist)
    if (clerkUserId && webhooks.length > 0) {
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (secretKey) {
        // Fetch GitHub token via Clerk
        const tokenRes = await fetch(
          `https://api.clerk.com/v1/users/${clerkUserId}/oauth_access_tokens/oauth_github`,
          { headers: { Authorization: `Bearer ${secretKey}` } },
        );

        if (tokenRes.ok) {
          const data = await tokenRes.json();
          const githubToken = Array.isArray(data) && data.length > 0 ? data[0].token : null;

          if (githubToken) {
            for (const { repo, webhookId } of webhooks) {
              try {
                await fetch(`https://api.github.com/repos/${repo}/hooks/${webhookId}`, {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: "application/vnd.github+json",
                  },
                });
              } catch (err) {
                console.error("Failed to remove GitHub webhook", { repo, webhookId, err });
              }
            }
          }
        }
      }
    }

    // 3. Delete Clerk user (last — webhook cleanup needs the user's OAuth tokens)
    if (clerkUserId) {
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (secretKey) {
        const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (!res.ok && res.status !== 404) {
          console.error("Failed to delete Clerk user", {
            clerkUserId,
            status: res.status,
            body: await res.text(),
          });
        }
      }
    }

    return null;
  },
});
