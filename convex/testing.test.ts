import { convexTest } from "convex-test";
import { beforeEach, afterEach, vi } from "vite-plus/test";
import schema from "./schema";

export const modules = import.meta.glob("./**/*.ts");

// Suppress expected "CLERK_SECRET_KEY not set" warnings from scheduled clerkSync action
beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

export function testCtx() {
  return convexTest(schema, modules);
}

const ISSUER = "https://test.clerk.dev";

export function userIdentity(id: string) {
  return {
    subject: id,
    issuer: ISSUER,
    tokenIdentifier: `${ISSUER}|${id}`,
  };
}

export async function setupUser(
  t: ReturnType<typeof convexTest>,
  id = "user1",
  username = "testuser",
) {
  const identity = userIdentity(id);
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      username,
      streak: 0,
    });
  });
  return { userId, as: t.withIdentity(identity) };
}

/** Create a user and a "building" commitment owned by them. */
export async function setupUserWithCommitment(
  t: ReturnType<typeof convexTest>,
  id = "user1",
  username = "testuser",
  text = "Build something great",
) {
  const { userId, as } = await setupUser(t, id, username);
  const commitmentId = await t.run(async (ctx) => {
    return await ctx.db.insert("commitments", {
      userId,
      text,
      status: "building",
      commentCount: 0,
      boostCount: 0,
      lastActivityAt: Date.now(),
      activity: [0, 0, 0, 0, 0, 0, 0],
    });
  });
  return { userId, as, commitmentId };
}
