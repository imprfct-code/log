import { R2 } from "@convex-dev/r2";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { getUserByToken } from "./users";

export const r2 = new R2(components.r2);

const clientApi = r2.clientApi<DataModel>({
  checkUpload: async (ctx) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");
  },
  checkDelete: async (ctx, _bucket, key) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");
    // Keys are scoped to user: uploads/{userId}/YYYY-MM-DD/{uuid}
    if (!key.startsWith(`uploads/${user._id}/`)) {
      throw new Error("Not authorized to delete this file");
    }
  },
});

// Custom generateUploadUrl with user-scoped key: uploads/{userId}/YYYY-MM-DD/{uuid}
export const generateUploadUrl = mutation({
  args: {},
  returns: v.object({ key: v.string(), url: v.string() }),
  handler: async (ctx) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const date = new Date().toISOString().slice(0, 10);
    const key = `uploads/${user._id}/${date}/${crypto.randomUUID()}`;
    return r2.generateUploadUrl(key);
  },
});

export const { syncMetadata, deleteObject, getMetadata } = clientApi;
