import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { getUserByToken } from "./users";
import { computeVisibility, redactEntry } from "./privacy";
import { resolveAttachments } from "./devlog";

const REPO_RE = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

function validateRepo(repo: string) {
  if (!REPO_RE.test(repo)) {
    throw new Error("Invalid repo format, expected owner/repo");
  }
}

export const create = mutation({
  args: {
    text: v.string(),
    repo: v.optional(v.string()),
  },
  handler: async (ctx, { text, repo }) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    if (repo) validateRepo(repo);

    const commitmentId = await ctx.db.insert("commitments", {
      userId: user._id,
      text,
      repo,
      isPrivate: false,
      status: "building",
      commentCount: 0,
      respectCount: 0,
      lastActivityAt: now,
      activity: [0, 0, 0, 0, 0, 0, 0],
    });

    // Set up GitHub commit tracking if repo provided
    if (repo) {
      if (user.clerkUserId) {
        await ctx.scheduler.runAfter(0, internal.github.checkRepoPrivacy, {
          commitmentId,
          repo,
          clerkUserId: user.clerkUserId,
        });
      }

      const syncMode = user.syncMode ?? "polling";
      if (syncMode === "webhook") {
        await ctx.scheduler.runAfter(0, internal.github.registerWebhook, { commitmentId, repo });
      } else {
        await ctx.scheduler.runAfter(0, internal.githubPolling.setupPolling, {
          commitmentId,
          repo,
        });
      }
    }

    return commitmentId;
  },
});

export const getById = query({
  args: { id: v.id("commitments"), viewAsGuest: v.optional(v.boolean()) },
  handler: async (ctx, { id, viewAsGuest }) => {
    const commitment = await ctx.db.get(id);
    if (!commitment) return null;

    const user = await ctx.db.get(commitment.userId);
    const viewer = await getUserByToken(ctx);
    const isAuthor = viewer !== null && viewer._id === commitment.userId;
    const effectiveAuthor = isAuthor && !viewAsGuest;

    const { showMessages, showHashes, showBranches } = computeVisibility({
      isPrivate: commitment.isPrivate,
      ownerPrefs: user ?? undefined,
      isAuthor: effectiveAuthor,
    });

    return { ...commitment, user, showMessages, showHashes, showBranches };
  },
});

export const listFeed = query({
  args: {
    status: v.optional(v.union(v.literal("building"), v.literal("shipped"))),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { status, paginationOpts }) => {
    const viewer = await getUserByToken(ctx);

    const baseQuery = status
      ? ctx.db
          .query("commitments")
          .withIndex("by_status_and_lastActivityAt", (q) => q.eq("status", status))
      : ctx.db.query("commitments").withIndex("by_lastActivityAt");

    const page = await baseQuery.order("desc").paginate(paginationOpts);

    const itemsWithData = await Promise.all(
      page.page.map(async (commitment) => {
        const user = await ctx.db.get(commitment.userId);
        const isAuthor = viewer !== null && viewer._id === commitment.userId;
        const flags = computeVisibility({
          isPrivate: commitment.isPrivate,
          ownerPrefs: user ?? undefined,
          isAuthor,
        });

        // Fetch 5 entries to detect "has more" without reading the entire collection
        const entries = await ctx.db
          .query("devlogEntries")
          .withIndex("by_commitmentId_and_committedAt", (q) => q.eq("commitmentId", commitment._id))
          .order("desc")
          .take(5);

        const hasMore = entries.length > 4;
        const redacted = await Promise.all(
          entries.slice(0, 4).map(async (e) => {
            const entry = redactEntry(e, flags, commitment.isPrivate, isAuthor);
            return {
              ...entry,
              resolvedAttachments: await resolveAttachments(e.attachments),
            };
          }),
        );

        return {
          ...commitment,
          user,
          recentEntries: redacted,
          hasMore,
          showMessages: flags.showMessages,
          showHashes: flags.showHashes,
          showBranches: flags.showBranches,
        };
      }),
    );

    return { ...page, page: itemsWithData };
  },
});

export const search = query({
  args: {
    query: v.string(),
    status: v.optional(v.union(v.literal("building"), v.literal("shipped"))),
  },
  handler: async (ctx, { query: searchQuery, status }) => {
    const viewer = await getUserByToken(ctx);

    const q = ctx.db.query("commitments").withSearchIndex("search_text", (s) => {
      const base = s.search("text", searchQuery);
      return status ? base.eq("status", status) : base;
    });

    const results = await q.take(20);

    return await Promise.all(
      results.map(async (commitment) => {
        const user = await ctx.db.get(commitment.userId);
        const isAuthor = viewer !== null && viewer._id === commitment.userId;
        const flags = computeVisibility({
          isPrivate: commitment.isPrivate,
          ownerPrefs: user ?? undefined,
          isAuthor,
        });
        return { ...commitment, user, ...flags };
      }),
    );
  },
});

export const listByUser = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.union(v.literal("building"), v.literal("shipped"))),
  },
  handler: async (ctx, { userId, status }) => {
    let results;
    if (status) {
      results = await ctx.db
        .query("commitments")
        .withIndex("by_userId_and_status", (q) => q.eq("userId", userId).eq("status", status))
        .order("desc")
        .take(50);
    } else {
      results = await ctx.db
        .query("commitments")
        .withIndex("by_userId_and_status", (q) => q.eq("userId", userId))
        .order("desc")
        .take(50);
    }
    return results;
  },
});

export const connectRepo = mutation({
  args: {
    id: v.id("commitments"),
    repo: v.string(),
  },
  handler: async (ctx, { id, repo }) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const commitment = await ctx.db.get(id);
    if (!commitment) throw new Error("Commitment not found");
    if (commitment.userId !== user._id) throw new Error("Not the owner");
    if (commitment.repo) throw new Error("Repo already connected");

    validateRepo(repo);

    await ctx.db.patch(id, { repo, isPrivate: false });

    if (user.clerkUserId) {
      await ctx.scheduler.runAfter(0, internal.github.checkRepoPrivacy, {
        commitmentId: id,
        repo,
        clerkUserId: user.clerkUserId,
      });
    }

    // Set up GitHub commit tracking based on user preference
    const syncMode = user.syncMode ?? "polling";
    if (syncMode === "webhook") {
      await ctx.scheduler.runAfter(0, internal.github.registerWebhook, { commitmentId: id, repo });
    } else {
      await ctx.scheduler.runAfter(0, internal.githubPolling.setupPolling, {
        commitmentId: id,
        repo,
      });
    }
  },
});

export const ship = mutation({
  args: {
    id: v.id("commitments"),
    shipUrl: v.string(),
    shipNote: v.optional(v.string()),
  },
  handler: async (ctx, { id, shipUrl, shipNote }) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const commitment = await ctx.db.get(id);
    if (!commitment) throw new Error("Commitment not found");
    if (commitment.userId !== user._id) throw new Error("Not the owner");
    if (commitment.status !== "building") throw new Error("Already shipped");

    await ctx.db.patch(id, {
      status: "shipped",
      shipUrl,
      shipNote,
      shippedAt: Date.now(),
    });

    // Remove GitHub webhook if one was registered
    if (commitment.repo && commitment.webhookId) {
      await ctx.scheduler.runAfter(0, internal.github.removeWebhook, {
        commitmentId: id,
        repo: commitment.repo,
        webhookId: commitment.webhookId,
      });
    }
  },
});
