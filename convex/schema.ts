import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const attachmentValidator = v.object({
  key: v.string(),
  type: v.union(v.literal("image"), v.literal("video")),
  filename: v.string(),
  hasMarkdownRef: v.optional(v.boolean()),
  cover: v.optional(v.boolean()),
  duration: v.optional(v.number()),
  inline: v.optional(v.boolean()),
});

export default defineSchema({
  waitlist: defineTable({
    email: v.string(),
  }).index("by_email", ["email"]),

  users: defineTable({
    tokenIdentifier: v.string(),
    clerkUserId: v.optional(v.string()),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
    syncMode: v.optional(v.union(v.literal("polling"), v.literal("webhook"))),
    streak: v.number(),
    lastActiveDate: v.optional(v.string()),
    privateShowMessages: v.optional(v.boolean()),
    privateShowHashes: v.optional(v.boolean()),
    privateShowBranches: v.optional(v.boolean()),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_username", ["username"]),

  commitments: defineTable({
    userId: v.id("users"),
    text: v.string(),
    repo: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    status: v.union(v.literal("building"), v.literal("shipped")),
    shipUrl: v.optional(v.string()),
    shipNote: v.optional(v.string()),
    shippedAt: v.optional(v.number()),
    webhookId: v.optional(v.number()),
    lastPolledAt: v.optional(v.number()),
    initialSyncStatus: v.optional(v.union(v.literal("syncing"), v.literal("ready"))),
    syncCurrentBranch: v.optional(v.string()),
    commentCount: v.number(),
    respectCount: v.number(),
    lastActivityAt: v.number(),
    activity: v.array(v.number()),
  })
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_status_and_lastActivityAt", ["status", "lastActivityAt"])
    .index("by_lastActivityAt", ["lastActivityAt"])
    .index("by_repo", ["repo"])
    .index("by_repo_and_status", ["repo", "status"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["status"],
    }),

  devlogEntries: defineTable({
    commitmentId: v.id("commitments"),
    userId: v.id("users"),
    type: v.union(
      v.literal("commit"),
      v.literal("post"),
      v.literal("git_commit"),
      v.literal("ship"),
    ),
    text: v.string(),
    body: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")), // legacy, unused
    attachments: v.optional(v.array(attachmentValidator)),
    hash: v.optional(v.string()),
    gitAuthor: v.optional(v.string()),
    gitUrl: v.optional(v.string()),
    gitBranch: v.optional(v.string()),
    committedAt: v.optional(v.number()),
    shipNote: v.optional(v.string()),
    isMilestone: v.optional(v.boolean()),
    commentCount: v.number(),
  })
    .index("by_commitmentId", ["commitmentId"])
    .index("by_userId", ["userId"])
    .index("by_commitmentId_and_hash", ["commitmentId", "hash"])
    .index("by_commitmentId_and_committedAt", ["commitmentId", "committedAt"]),

  comments: defineTable({
    userId: v.id("users"),
    commitmentId: v.id("commitments"),
    devlogEntryId: v.optional(v.id("devlogEntries")),
    text: v.string(),
  })
    .index("by_commitmentId", ["commitmentId"])
    .index("by_devlogEntryId", ["devlogEntryId"]),

  respects: defineTable({
    userId: v.id("users"),
    commitmentId: v.id("commitments"),
  })
    .index("by_commitmentId", ["commitmentId"])
    .index("by_userId_and_commitmentId", ["userId", "commitmentId"]),
});
