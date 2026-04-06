import { describe, expect, test } from "vite-plus/test";
import { api } from "./_generated/api";
import { setupUser, testCtx, userIdentity } from "./testing.test";

describe("users.getOrCreate", () => {
  test("creates a new user on first login", async () => {
    const t = testCtx();
    const identity = userIdentity("newuser");
    const asUser = t.withIdentity({ ...identity, nickname: "cooldev" });

    const userId = await asUser.mutation(api.users.getOrCreate, {});
    const user = await asUser.query(api.users.getMe, {});

    expect(user).toMatchObject({
      _id: userId,
      tokenIdentifier: identity.tokenIdentifier,
      username: "cooldev",
      streak: 0,
    });
  });

  test("returns existing user on repeat login", async () => {
    const t = testCtx();
    const identity = userIdentity("returning");
    const asUser = t.withIdentity({ ...identity, nickname: "returning" });

    const firstId = await asUser.mutation(api.users.getOrCreate, {});
    const secondId = await asUser.mutation(api.users.getOrCreate, {});

    expect(firstId).toEqual(secondId);
  });

  test("throws for unauthenticated user", async () => {
    const t = testCtx();
    await expect(t.mutation(api.users.getOrCreate, {})).rejects.toThrow("Not authenticated");
  });
});

describe("users.updateProfile", () => {
  test("updates only provided fields", async () => {
    const t = testCtx();
    const { as } = await setupUser(t, "user1", "original");

    await as.mutation(api.users.updateProfile, { bio: "Builder" });
    let user = await as.query(api.users.getMe, {});

    expect(user?.username).toBe("original"); // unchanged
    expect(user?.bio).toBe("Builder");

    await as.mutation(api.users.updateProfile, { username: "newname" });
    user = await as.query(api.users.getMe, {});

    expect(user?.username).toBe("newname");
    expect(user?.bio).toBe("Builder"); // still there
  });

  test("updates github username", async () => {
    const t = testCtx();
    const { as } = await setupUser(t);

    await as.mutation(api.users.updateProfile, { githubUsername: "imprfct" });
    const user = await as.query(api.users.getMe, {});

    expect(user?.githubUsername).toBe("imprfct");
  });

  test("throws for unauthenticated user", async () => {
    const t = testCtx();
    await expect(t.mutation(api.users.updateProfile, { bio: "hacker" })).rejects.toThrow(
      "Not authenticated",
    );
  });
});

describe("users.getMe", () => {
  test("returns null when not authenticated", async () => {
    const t = testCtx();
    const user = await t.query(api.users.getMe, {});
    expect(user).toBeNull();
  });

  test("returns user when authenticated", async () => {
    const t = testCtx();
    const { as } = await setupUser(t, "user1", "testuser");

    const user = await as.query(api.users.getMe, {});
    expect(user?.username).toBe("testuser");
  });
});

describe("users.getByUsername", () => {
  test("finds user by username", async () => {
    const t = testCtx();
    await setupUser(t, "user1", "findme");

    const user = await t.query(api.users.getByUsername, { username: "findme" });
    expect(user?.username).toBe("findme");
  });

  test("returns null for unknown username", async () => {
    const t = testCtx();
    const user = await t.query(api.users.getByUsername, { username: "ghost" });
    expect(user).toBeNull();
  });
});
