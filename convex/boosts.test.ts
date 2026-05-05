import { describe, expect, test } from "vite-plus/test";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { setupUser, setupUserWithCommitment, testCtx } from "./testing.test";

/** Ship a commitment so it can receive boosts. */
async function shipCommitment(t: ReturnType<typeof testCtx>, commitmentId: Id<"commitments">) {
  await t.run(async (ctx) => {
    await ctx.db.patch(commitmentId, {
      status: "shipped" as const,
      shipUrl: "https://shipped.dev",
      shippedAt: Date.now(),
    });
  });
}

describe("boosts.toggle", () => {
  test("adds boost to shipped commitment", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: booster } = await setupUser(t, "booster", "fan");
    await shipCommitment(t, commitmentId);

    const result = await booster.mutation(api.boosts.toggle, { commitmentId });

    expect(result).toEqual({ boosted: true });
    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.boostCount).toBe(1);
  });

  test("removes boost on second toggle", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: booster } = await setupUser(t, "booster", "fan");
    await shipCommitment(t, commitmentId);

    await booster.mutation(api.boosts.toggle, { commitmentId });
    const result = await booster.mutation(api.boosts.toggle, { commitmentId });

    expect(result).toEqual({ boosted: false });
    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.boostCount).toBe(0);
  });

  test("cannot boost a building commitment", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: booster } = await setupUser(t, "booster", "fan");

    await expect(booster.mutation(api.boosts.toggle, { commitmentId })).rejects.toThrow(
      "Can only boost shipped commitments",
    );
  });

  test("boost count never goes negative", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: booster } = await setupUser(t, "booster", "fan");
    await shipCommitment(t, commitmentId);

    // Force boostCount to 0, then toggle off (from a state with existing boost doc)
    await booster.mutation(api.boosts.toggle, { commitmentId }); // adds (count=1)
    await t.run(async (ctx) => ctx.db.patch(commitmentId, { boostCount: 0 })); // force to 0
    await booster.mutation(api.boosts.toggle, { commitmentId }); // removes, Math.max(0, -1)

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.boostCount).toBe(0);
  });

  test("multiple users can boost the same commitment", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    await shipCommitment(t, commitmentId);

    const { as: fan1 } = await setupUser(t, "fan1", "fan_one");
    const { as: fan2 } = await setupUser(t, "fan2", "fan_two");
    const { as: fan3 } = await setupUser(t, "fan3", "fan_three");

    await fan1.mutation(api.boosts.toggle, { commitmentId });
    await fan2.mutation(api.boosts.toggle, { commitmentId });
    await fan3.mutation(api.boosts.toggle, { commitmentId });

    const commitment = await t.query(api.commitments.getById, { id: commitmentId });
    expect(commitment?.boostCount).toBe(3);
  });
});

describe("boosts.hasBoosted", () => {
  test("returns false when not boosted", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: viewer } = await setupUser(t, "viewer", "viewer");
    await shipCommitment(t, commitmentId);

    const result = await viewer.query(api.boosts.hasBoosted, { commitmentId });
    expect(result).toBe(false);
  });

  test("returns true after boosting", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: fan } = await setupUser(t, "fan", "fan");
    await shipCommitment(t, commitmentId);

    await fan.mutation(api.boosts.toggle, { commitmentId });
    const result = await fan.query(api.boosts.hasBoosted, { commitmentId });
    expect(result).toBe(true);
  });

  test("returns false after un-boosting", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    const { as: fan } = await setupUser(t, "fan", "fan");
    await shipCommitment(t, commitmentId);

    await fan.mutation(api.boosts.toggle, { commitmentId });
    await fan.mutation(api.boosts.toggle, { commitmentId });
    const result = await fan.query(api.boosts.hasBoosted, { commitmentId });
    expect(result).toBe(false);
  });

  test("returns false for unauthenticated user", async () => {
    const t = testCtx();
    const { commitmentId } = await setupUserWithCommitment(t, "owner");
    await shipCommitment(t, commitmentId);

    const result = await t.query(api.boosts.hasBoosted, { commitmentId });
    expect(result).toBe(false);
  });
});
