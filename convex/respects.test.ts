import { describe, expect, test } from "vite-plus/test";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { setupUser, setupUserWithCommitment, testCtx } from "./testing.test";

/** Ship a commitment so it can receive respects. */
async function shipCommitment(t: ReturnType<typeof testCtx>, commitmentId: Id<"commitments">) {
  await t.run(async (ctx) => {
    await ctx.db.patch(commitmentId, {
      status: "shipped" as const,
      shipUrl: "https://shipped.dev",
      shippedAt: Date.now(),
    });
  });
}

describe("respects.toggle", () => {
  test("adds respect to shipped commitment", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: respector } = await setupUser(t, "respector", "fan");
    await shipCommitment(t, commitmentId);

    const result = await respector.mutation(api.respects.toggle, { commitmentId });

    expect(result).toEqual({ respected: true });
    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.respectCount).toBe(1);
  });

  test("removes respect on second toggle", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: respector } = await setupUser(t, "respector", "fan");
    await shipCommitment(t, commitmentId);

    await respector.mutation(api.respects.toggle, { commitmentId });
    const result = await respector.mutation(api.respects.toggle, { commitmentId });

    expect(result).toEqual({ respected: false });
    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.respectCount).toBe(0);
  });

  test("cannot respect a building commitment", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: respector } = await setupUser(t, "respector", "fan");

    await expect(respector.mutation(api.respects.toggle, { commitmentId })).rejects.toThrow(
      "Can only respect released commitments",
    );
  });

  test("respect count never goes negative", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: respector } = await setupUser(t, "respector", "fan");
    await shipCommitment(t, commitmentId);

    // Force respectCount to 0, then toggle off (from a state with existing respect doc)
    await respector.mutation(api.respects.toggle, { commitmentId }); // adds (count=1)
    await t.run(async (ctx) => ctx.db.patch(commitmentId, { respectCount: 0 })); // force to 0
    await respector.mutation(api.respects.toggle, { commitmentId }); // removes, Math.max(0, -1)

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.respectCount).toBe(0);
  });

  test("multiple users can respect the same commitment", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    await shipCommitment(t, commitmentId);

    const { as: fan1 } = await setupUser(t, "fan1", "fan_one");
    const { as: fan2 } = await setupUser(t, "fan2", "fan_two");
    const { as: fan3 } = await setupUser(t, "fan3", "fan_three");

    await fan1.mutation(api.respects.toggle, { commitmentId });
    await fan2.mutation(api.respects.toggle, { commitmentId });
    await fan3.mutation(api.respects.toggle, { commitmentId });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.respectCount).toBe(3);
  });
});

describe("respects.hasRespected", () => {
  test("returns false when not respected", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: viewer } = await setupUser(t, "viewer", "viewer");
    await shipCommitment(t, commitmentId);

    const result = await viewer.query(api.respects.hasRespected, { commitmentId });
    expect(result).toBe(false);
  });

  test("returns true after respecting", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: fan } = await setupUser(t, "fan", "fan");
    await shipCommitment(t, commitmentId);

    await fan.mutation(api.respects.toggle, { commitmentId });
    const result = await fan.query(api.respects.hasRespected, { commitmentId });
    expect(result).toBe(true);
  });

  test("returns false after un-respecting", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: fan } = await setupUser(t, "fan", "fan");
    await shipCommitment(t, commitmentId);

    await fan.mutation(api.respects.toggle, { commitmentId });
    await fan.mutation(api.respects.toggle, { commitmentId });
    const result = await fan.query(api.respects.hasRespected, { commitmentId });
    expect(result).toBe(false);
  });

  test("returns false for unauthenticated user", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    await shipCommitment(t, commitmentId);

    const result = await t.query(api.respects.hasRespected, { commitmentId });
    expect(result).toBe(false);
  });
});
