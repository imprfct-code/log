import { describe, expect, test } from "vite-plus/test";
import { api } from "./_generated/api";
import { setupUser, setupUserWithCommitment, testCtx } from "./testing";

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
      respectCount: 0,
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

  test("cannot ship already shipped commitment", async () => {
    const t = testCtx();
    const { as, commitmentId } = await setupUserWithCommitment(t);

    await as.mutation(api.commitments.ship, { id: commitmentId, shipUrl: "https://log.dev" });

    await expect(
      as.mutation(api.commitments.ship, { id: commitmentId, shipUrl: "https://log.dev/v2" }),
    ).rejects.toThrow("Already shipped");
  });

  test("cannot ship someone else's commitment", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "user1");
    const { as: otherUser } = await setupUser(t, "user2", "otheruser");

    await expect(
      otherUser.mutation(api.commitments.ship, { id: commitmentId, shipUrl: "https://log.dev" }),
    ).rejects.toThrow("Not the owner");
  });
});
