import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { currentWeekActivity } from "./dates";
import { getUserByToken } from "./users";
import { computeVisibility, redactEntry } from "./privacy";
import { resolveAttachments, updateActivity } from "./devlog";
import { r2 } from "./r2";

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
      initialSyncStatus: repo ? "syncing" : undefined,
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

    const firstEntry = await ctx.db
      .query("devlogEntries")
      .withIndex("by_commitmentId_and_committedAt", (q) => q.eq("commitmentId", id))
      .order("asc")
      .first();

    // Sync progress during initial backfill
    let syncedCount: number | undefined;
    if (commitment.initialSyncStatus === "syncing") {
      const all = await ctx.db
        .query("devlogEntries")
        .withIndex("by_commitmentId", (q) => q.eq("commitmentId", id))
        .collect();
      syncedCount = all.length;
    }

    return {
      ...commitment,
      activity: currentWeekActivity(commitment.activity, commitment.lastActivityAt),
      firstEntryAt: firstEntry?.committedAt,
      syncedCount,
      user,
      showMessages,
      showHashes,
      showBranches,
    };
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

    // Paginate with a larger batch to account for filtering
    const page = await baseQuery.order("desc").paginate({
      ...paginationOpts,
      numItems: Math.ceil(paginationOpts.numItems * 1.5),
    });

    // Hide commitments still doing initial sync from the feed entirely
    const visiblePage = page.page.filter((c) => c.initialSyncStatus !== "syncing");

    const itemsWithData = await Promise.all(
      visiblePage.map(async (commitment) => {
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
              // Feed preview only needs the first attachment (thumbnail/cover)
              resolvedAttachments: await resolveAttachments(e.attachments?.slice(0, 1)),
            };
          }),
        );

        const firstEntry = await ctx.db
          .query("devlogEntries")
          .withIndex("by_commitmentId_and_committedAt", (q) => q.eq("commitmentId", commitment._id))
          .order("asc")
          .first();

        return {
          ...commitment,
          activity: currentWeekActivity(commitment.activity, commitment.lastActivityAt),
          firstEntryAt: firstEntry?.committedAt,
          user,
          recentEntries: redacted,
          hasMore,
          showMessages: flags.showMessages,
          showHashes: flags.showHashes,
          showBranches: flags.showBranches,
        };
      }),
    );

    // Return only the requested number of items
    return {
      ...page,
      page: itemsWithData.slice(0, paginationOpts.numItems),
    };
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

    const visibleResults = results.filter((c) => c.initialSyncStatus !== "syncing");

    return await Promise.all(
      visibleResults.map(async (commitment) => {
        const user = await ctx.db.get(commitment.userId);
        const isAuthor = viewer !== null && viewer._id === commitment.userId;
        const flags = computeVisibility({
          isPrivate: commitment.isPrivate,
          ownerPrefs: user ?? undefined,
          isAuthor,
        });
        const firstEntry = await ctx.db
          .query("devlogEntries")
          .withIndex("by_commitmentId_and_committedAt", (q) => q.eq("commitmentId", commitment._id))
          .order("asc")
          .first();
        return {
          ...commitment,
          activity: currentWeekActivity(commitment.activity, commitment.lastActivityAt),
          firstEntryAt: firstEntry?.committedAt,
          user,
          ...flags,
        };
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

    await ctx.db.patch(id, { repo, isPrivate: false, initialSyncStatus: "syncing" });

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

    const now = Date.now();

    await ctx.db.patch(id, {
      status: "shipped",
      shipUrl,
      shipNote,
      shippedAt: now,
      lastActivityAt: now,
      activity: updateActivity(commitment.activity, commitment.lastActivityAt),
    });

    await ctx.db.insert("devlogEntries", {
      commitmentId: id,
      userId: user._id,
      type: "ship",
      text: "shipped",
      committedAt: now,
      commentCount: 0,
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

/** Dev-only: nuke a commitment and ALL related data. Use from CLI:
 *  npx convex run commitments:devDelete '{"commitmentId": "..."}' */
export const devDelete = internalMutation({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    const commitment = await ctx.db.get(commitmentId);
    if (!commitment) throw new Error("Commitment not found");

    // 1. Delete comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitmentId))
      .collect();
    for (const c of comments) {
      await ctx.db.delete(c._id);
    }

    // 2. Delete respects
    const respects = await ctx.db
      .query("respects")
      .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitmentId))
      .collect();
    for (const r of respects) {
      await ctx.db.delete(r._id);
    }

    // 3. Delete devlog entries (with R2 cleanup)
    const entries = await ctx.db
      .query("devlogEntries")
      .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitmentId))
      .collect();
    for (const e of entries) {
      // Delete attachments from R2 (best-effort: log failures, don't abort the removal)
      for (const att of e.attachments ?? []) {
        try {
          await r2.deleteObject(ctx, att.key);
        } catch (err) {
          console.error("Failed to delete R2 object during devDelete", { key: att.key, err });
        }
      }
      await ctx.db.delete(e._id);
    }

    // 4. Schedule webhook cleanup if needed
    if (commitment.repo && commitment.webhookId) {
      await ctx.scheduler.runAfter(0, internal.github.removeWebhook, {
        commitmentId,
        repo: commitment.repo,
        webhookId: commitment.webhookId,
      });
    }

    // 5. Delete commitment
    await ctx.db.delete(commitmentId);

    return {
      deleted: {
        comments: comments.length,
        respects: respects.length,
        entries: entries.length,
      },
    };
  },
});
