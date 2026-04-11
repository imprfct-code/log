import { describe, expect, test } from "vite-plus/test";
import { api } from "./_generated/api";
import { setupUser, setupUserWithCommitment, testCtx } from "./testing.test";

describe("comments.create", () => {
  test("adds comment and increments commitment count", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await as.mutation(api.comments.create, { commitmentId, text: "Looking good!" });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.commentCount).toBe(1);
  });

  test("increments both counts when commenting on a devlog entry", async () => {
    const t = testCtx();
    const { userId, as, commitmentId } = await setupUserWithCommitment(t);

    // Create a devlog entry directly
    const entryId = await t.run(async (ctx) => {
      return await ctx.db.insert("devlogEntries", {
        commitmentId,
        userId,
        type: "post",
        text: "Day 1 progress",
        commentCount: 0,
      });
    });

    await as.mutation(api.comments.create, {
      commitmentId,
      devlogEntryId: entryId,
      text: "Nice work!",
    });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.commentCount).toBe(1);

    const entry = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(entry?.commentCount).toBe(1);
  });

  test("multiple comments increment correctly", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await as.mutation(api.comments.create, { commitmentId, text: "First" });
    await as.mutation(api.comments.create, { commitmentId, text: "Second" });
    await as.mutation(api.comments.create, { commitmentId, text: "Third" });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.commentCount).toBe(3);
  });

  test("throws for unauthenticated user", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t);

    await expect(
      t.mutation(api.comments.create, { commitmentId, text: "Anonymous" }),
    ).rejects.toThrow("Not authenticated");
  });
});

describe("comments.remove", () => {
  test("deletes comment and decrements commitment count", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    const commentId = await as.mutation(api.comments.create, { commitmentId, text: "To delete" });
    await as.mutation(api.comments.remove, { id: commentId });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.commentCount).toBe(0);
  });

  test("decrements devlog entry count when comment had entryId", async () => {
    const t = testCtx();
    const { userId, as, commitmentId } = await setupUserWithCommitment(t);

    const entryId = await t.run(async (ctx) => {
      return await ctx.db.insert("devlogEntries", {
        commitmentId,
        userId,
        type: "post",
        text: "Progress update",
        commentCount: 0,
      });
    });

    const commentId = await as.mutation(api.comments.create, {
      commitmentId,
      devlogEntryId: entryId,
      text: "Nice",
    });
    await as.mutation(api.comments.remove, { id: commentId });

    const entry = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(entry?.commentCount).toBe(0);
  });

  test("count never goes below 0", async () => {
    const t = testCtx();
    const { userId, as, commitmentId } = await setupUserWithCommitment(t);

    // Force commentCount to 0 directly, then delete a comment
    const commentId = await t.run(async (ctx) => {
      return await ctx.db.insert("comments", {
        userId,
        commitmentId,
        text: "orphan",
      });
    });
    // Commitment already has commentCount: 0, deleting should stay at 0
    await as.mutation(api.comments.remove, { id: commentId });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.commentCount).toBe(0);
  });

  test("cannot delete someone else's comment", async () => {
    const t = testCtx();
    const { as: user1, commitmentId } = await setupUserWithCommitment(t, "user1");
    const { as: user2 } = await setupUser(t, "user2", "otheruser");

    const commentId = await user1.mutation(api.comments.create, {
      commitmentId,
      text: "My comment",
    });

    await expect(user2.mutation(api.comments.remove, { id: commentId })).rejects.toThrow(
      "Not the owner",
    );
  });
});

describe("comments.update", () => {
  test("updates text successfully", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    const commentId = await as.mutation(api.comments.create, {
      commitmentId,
      text: "Original text",
    });

    await as.mutation(api.comments.update, { id: commentId, text: "Updated text" });

    const comment = await t.run(async (ctx) => ctx.db.get(commentId));
    expect(comment?.text).toBe("Updated text");
  });

  test("throws for unauthenticated user", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    const commentId = await as.mutation(api.comments.create, {
      commitmentId,
      text: "Original",
    });

    await expect(
      t.mutation(api.comments.update, { id: commentId, text: "Hacked" }),
    ).rejects.toThrow("Not authenticated");
  });

  test("throws for non-owner", async () => {
    const t = testCtx();
    const { as: user1, commitmentId } = await setupUserWithCommitment(t, "user1");
    const { as: user2 } = await setupUser(t, "user2", "otheruser");

    const commentId = await user1.mutation(api.comments.create, {
      commitmentId,
      text: "My comment",
    });

    await expect(
      user2.mutation(api.comments.update, { id: commentId, text: "Not mine" }),
    ).rejects.toThrow("Not the owner");
  });

  test("throws for empty text", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    const commentId = await as.mutation(api.comments.create, {
      commitmentId,
      text: "Original",
    });

    await expect(as.mutation(api.comments.update, { id: commentId, text: "   " })).rejects.toThrow(
      "Text cannot be empty",
    );
  });
});
