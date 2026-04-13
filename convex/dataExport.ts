import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

interface ExportData {
  profile: {
    username: string;
    bio: string | null;
    githubUsername: string | null;
    avatarUrl: string | null;
    syncMode: string;
    streak: number;
    lastActiveDate: string | null;
    createdAt: number;
  };
  commitments: Array<{
    text: string;
    repo: string | null;
    isPrivate: boolean;
    status: string;
    shipUrl: string | null;
    shipNote: string | null;
    shippedAt: number | null;
    createdAt: number;
    activity: number[];
    devlogEntries: Array<{
      type: string;
      text: string;
      body: string | null;
      hash: string | null;
      gitAuthor: string | null;
      gitUrl: string | null;
      gitBranch: string | null;
      committedAt: number | null;
      isMilestone: boolean;
      createdAt: number;
      attachments: Array<{ filename: string; type: string }>;
    }>;
    comments: Array<{
      text: string;
      createdAt: number;
      attachments: Array<{ filename: string; type: string }>;
    }>;
  }>;
  commentsOnOthers: Array<{
    text: string;
    createdAt: number;
    attachments: Array<{ filename: string; type: string }>;
  }>;
  boosts: Array<{
    commitmentId: Id<"commitments">;
    createdAt: number;
  }>;
}

/** Gather all data for a user (for GDPR data export). */
export const gatherUserData = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // User profile (exclude internal tokenIdentifier)
    const profile = {
      username: user.username,
      bio: user.bio ?? null,
      githubUsername: user.githubUsername ?? null,
      avatarUrl: user.avatarUrl ?? null,
      syncMode: user.syncMode ?? "polling",
      streak: user.streak,
      lastActiveDate: user.lastActiveDate ?? null,
      createdAt: user._creationTime,
    };

    // All commitments with their devlog entries
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", userId))
      .collect();

    // Fetch all user comments once, then partition by own vs external commitments
    const allUserComments = await ctx.db
      .query("comments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const ownCommitmentIds = new Set<Id<"commitments">>(commitments.map((c) => c._id));

    const commentsByCommitment = new Map<Id<"commitments">, Doc<"comments">[]>();
    const externalCommentDocs: Doc<"comments">[] = [];

    for (const c of allUserComments) {
      if (ownCommitmentIds.has(c.commitmentId)) {
        const list = commentsByCommitment.get(c.commitmentId) ?? [];
        list.push(c);
        commentsByCommitment.set(c.commitmentId, list);
      } else {
        externalCommentDocs.push(c);
      }
    }

    const commitmentData = await Promise.all(
      commitments.map(async (c) => {
        const entries = await ctx.db
          .query("devlogEntries")
          .withIndex("by_commitmentId", (q) => q.eq("commitmentId", c._id))
          .collect();

        const ownComments = commentsByCommitment.get(c._id) ?? [];

        return {
          text: c.text,
          repo: c.repo ?? null,
          isPrivate: c.isPrivate ?? false,
          status: c.status,
          shipUrl: c.shipUrl ?? null,
          shipNote: c.shipNote ?? null,
          shippedAt: c.shippedAt ?? null,
          createdAt: c._creationTime,
          activity: c.activity,
          devlogEntries: entries.map((e) => ({
            type: e.type,
            text: e.text,
            body: e.body ?? null,
            hash: e.hash ?? null,
            gitAuthor: e.gitAuthor ?? null,
            gitUrl: e.gitUrl ?? null,
            gitBranch: e.gitBranch ?? null,
            committedAt: e.committedAt ?? null,
            isMilestone: e.isMilestone ?? false,
            createdAt: e._creationTime,
            attachments: (e.attachments ?? []).map((a) => ({
              filename: a.filename,
              type: a.type,
            })),
          })),
          comments: ownComments.map((cm) => ({
            text: cm.text,
            createdAt: cm._creationTime,
            attachments: (cm.attachments ?? []).map((a) => ({
              filename: a.filename,
              type: a.type,
            })),
          })),
        };
      }),
    );

    const externalComments = externalCommentDocs.map((c) => ({
      text: c.text,
      createdAt: c._creationTime,
      attachments: (c.attachments ?? []).map((a) => ({
        filename: a.filename,
        type: a.type,
      })),
    }));

    // Boosts user gave
    const boosts = await ctx.db
      .query("boosts")
      .withIndex("by_userId_and_commitmentId", (q) => q.eq("userId", userId))
      .collect();

    const boostData = boosts.map((b) => ({
      commitmentId: b.commitmentId,
      createdAt: b._creationTime,
    }));

    return {
      profile,
      commitments: commitmentData,
      commentsOnOthers: externalComments,
      boosts: boostData,
    };
  },
});

/** Public action: export all user data as JSON (GDPR data portability). */
export const exportMyData = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getByTokenIdentifier, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    const data: ExportData = await ctx.runQuery(internal.dataExport.gatherUserData, {
      userId: user._id,
    });

    return {
      exportedAt: new Date().toISOString(),
      ...data,
    };
  },
});
