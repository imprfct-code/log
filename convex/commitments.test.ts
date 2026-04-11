import { describe, expect, test } from "vite-plus/test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { setupUser, setupUserWithCommitment, testCtx } from "./testing.test";

describe("commitments.create", () => {
  test("creates a commitment with correct defaults", async () => {
    const t = testCtx();
    const { as } = await setupUser(t);

    const id = await as.mutation(api.commitments.create, { text: "Build Log" });
    const commitment = await t.query(api.commitments.getById, { id });

    expect(commitment).toMatchObject({
      text: "Build Log",
      status: "building",
      commentCount: 0,
      boostCount: 0,
      activity: [0, 0, 0, 0, 0, 0, 0],
    });
  });

  test("stores optional repo field", async () => {
    const t = testCtx();
    const { as } = await setupUser(t);

    const id = await as.mutation(api.commitments.create, {
      text: "Build Log",
      repo: "imprfct/log",
    });
    const commitment = await t.query(api.commitments.getById, { id });

    expect(commitment?.repo).toBe("imprfct/log");
  });

  test("throws for unauthenticated user", async () => {
    const t = testCtx();

    await expect(t.mutation(api.commitments.create, { text: "Build Log" })).rejects.toThrow(
      "Not authenticated",
    );
  });
});

describe("commitments.connectRepo", () => {
  test("connects repo to a commitment", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await as.mutation(api.commitments.connectRepo, {
      id: commitmentId,
      repo: "imprfct/log",
    });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.repo).toBe("imprfct/log");
  });

  test("throws for unauthenticated user", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t);

    await expect(
      t.mutation(api.commitments.connectRepo, { id: commitmentId, repo: "owner/repo" }),
    ).rejects.toThrow("Not authenticated");
  });

  test("cannot connect repo to someone else's commitment", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "user1");
    const { as: otherUser } = await setupUser(t, "user2", "otheruser");

    await expect(
      otherUser.mutation(api.commitments.connectRepo, { id: commitmentId, repo: "owner/repo" }),
    ).rejects.toThrow("Not the owner");
  });

  test("cannot overwrite already connected repo", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await as.mutation(api.commitments.connectRepo, { id: commitmentId, repo: "imprfct/log" });

    await expect(
      as.mutation(api.commitments.connectRepo, { id: commitmentId, repo: "imprfct/other" }),
    ).rejects.toThrow("Repo already connected");
  });
});

describe("commitments.ship", () => {
  test("ships a building commitment", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await as.mutation(api.commitments.ship, {
      id: commitmentId,
      shipUrl: "https://log.dev",
      shipNote: "First release!",
    });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.status).toBe("shipped");
    expect(commitment?.shipUrl).toBe("https://log.dev");
    expect(commitment?.shipNote).toBe("First release!");
    expect(commitment?.shippedAt).toBeTypeOf("number");
  });

  test("cannot ship already released commitment", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await as.mutation(api.commitments.ship, { id: commitmentId, shipUrl: "https://log.dev" });

    await expect(
      as.mutation(api.commitments.ship, { id: commitmentId, shipUrl: "https://log.dev/v2" }),
    ).rejects.toThrow("Already released");
  });

  test("cannot ship someone else's commitment", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "user1");
    const { as: otherUser } = await setupUser(t, "user2", "otheruser");

    await expect(
      otherUser.mutation(api.commitments.ship, { id: commitmentId, shipUrl: "https://log.dev" }),
    ).rejects.toThrow("Not the owner");
  });

  test("keepBuilding keeps status building", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await as.mutation(api.commitments.ship, {
      id: commitmentId,
      shipUrl: "log.dev",
      keepBuilding: true,
    });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.status).toBe("building");
    expect(commitment?.shipUrl).toBe("log.dev");
    expect(commitment?.shippedAt).toBeTypeOf("number");
  });

  test("can ship again after keepBuilding ship", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await as.mutation(api.commitments.ship, {
      id: commitmentId,
      shipUrl: "log.dev",
      keepBuilding: true,
    });

    await as.mutation(api.commitments.ship, {
      id: commitmentId,
      shipUrl: "log.dev/v2",
    });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.status).toBe("shipped");
    expect(commitment?.shipUrl).toBe("log.dev/v2");
  });

  test("keepBuilding ship creates devlog entry with body", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await as.mutation(api.commitments.ship, {
      id: commitmentId,
      shipUrl: "log.dev",
      keepBuilding: true,
    });

    const entries = await t.run(async (ctx) => {
      return await ctx.db
        .query("devlogEntries")
        .withIndex("by_commitmentId", (q) => q.eq("commitmentId", commitmentId))
        .collect();
    });

    const shipEntry = entries.find((e) => e.type === "ship");
    expect(shipEntry).toBeDefined();
    expect(shipEntry!.body).toBe("log.dev");
    expect(shipEntry!.isMilestone).toBe(true);
  });
});

// Helper: create a private commitment with a git_commit entry
async function setupPrivateCommitmentWithEntry(
  t: ReturnType<typeof testCtx>,
  userId: Id<"users">,
  commitmentId: Id<"commitments">,
) {
  await t.run(async (ctx) => {
    await ctx.db.patch(commitmentId, { isPrivate: true, repo: "owner/private-repo" });
    await ctx.db.insert("devlogEntries", {
      commitmentId,
      userId,
      type: "git_commit",
      text: "fix secret bug in auth",
      hash: "abc1234def5678",
      gitBranch: "feature/secret-auth",
      gitUrl: "https://github.com/owner/private-repo/commit/abc1234",
      gitAuthor: "owner",
      committedAt: Date.now(),
      commentCount: 0,
    });
  });
}

describe("privacy: server-side filtering", () => {
  test("non-author sees redacted entries in feed for private commitment", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupUserWithCommitment(t);
    await setupPrivateCommitmentWithEntry(t, userId, commitmentId);
    const { as: otherUser } = await setupUser(t, "user2", "otheruser");

    const feed = await otherUser.query(api.commitments.listFeed, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    const item = feed.page.find((c) => c._id === commitmentId);
    expect(item).toBeDefined();

    const entry = item!.recentEntries[0];
    // Default prefs: showMessages=true, showHashes=false, showBranches=false
    expect(entry.text).toBe("fix secret bug in auth"); // messages shown by default
    expect(entry.hash).toBeUndefined(); // hashes hidden by default
    expect(entry.gitBranch).toBeUndefined(); // branches hidden by default
    expect(entry.gitUrl).toBeUndefined(); // always hidden for non-author on private
    expect(entry.gitAuthor).toBeUndefined();
  });

  test("author sees full entries in feed for own private commitment", async () => {
    const t = testCtx();
    const { userId, as, commitmentId } = await setupUserWithCommitment(t);
    await setupPrivateCommitmentWithEntry(t, userId, commitmentId);

    const feed = await as.query(api.commitments.listFeed, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    const item = feed.page.find((c) => c._id === commitmentId);
    const entry = item!.recentEntries[0];

    expect(entry.text).toBe("fix secret bug in auth");
    expect(entry.hash).toBe("abc1234def5678");
    expect(entry.gitBranch).toBe("feature/secret-auth");
    expect(entry.gitUrl).toBe("https://github.com/owner/private-repo/commit/abc1234");
    expect(entry.gitAuthor).toBe("owner");
  });

  test("viewAsGuest returns guest-level visibility flags for author", async () => {
    const t = testCtx();
    const { userId, as, commitmentId } = await setupUserWithCommitment(t);
    await setupPrivateCommitmentWithEntry(t, userId, commitmentId);

    const asAuthor = await as.query(api.commitments.getById, { id: commitmentId });
    expect(asAuthor!.showMessages).toBe(true);
    expect(asAuthor!.showHashes).toBe(true);
    expect(asAuthor!.showBranches).toBe(true);

    const asGuest = await as.query(api.commitments.getById, {
      id: commitmentId,
      viewAsGuest: true,
    });
    // With default prefs: messages=true, hashes=false, branches=false
    expect(asGuest!.showMessages).toBe(true);
    expect(asGuest!.showHashes).toBe(false);
    expect(asGuest!.showBranches).toBe(false);
  });

  test("respects custom owner privacy preferences", async () => {
    const t = testCtx();
    const { userId, commitmentId } = await setupUserWithCommitment(t);
    await setupPrivateCommitmentWithEntry(t, userId, commitmentId);

    // Owner enables showing hashes but disables messages
    await t.run(async (ctx) => {
      await ctx.db.patch(userId, {
        privateShowMessages: false,
        privateShowHashes: true,
        privateShowBranches: false,
      });
    });

    const { as: otherUser } = await setupUser(t, "user2", "otheruser");
    const feed = await otherUser.query(api.commitments.listFeed, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    const item = feed.page.find((c) => c._id === commitmentId);
    const entry = item!.recentEntries[0];

    expect(entry.text).toBe("private commit"); // messages hidden
    expect(entry.hash).toBe("abc1234def5678"); // hashes shown per pref
    expect(entry.gitBranch).toBeUndefined(); // branches hidden
    expect(entry.gitUrl).toBeUndefined(); // always hidden for non-author
  });
});
