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
  checkDelete: async (ctx) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");
  },
});

// Custom generateUploadUrl with structured key: uploads/YYYY-MM-DD/{uuid}
export const generateUploadUrl = mutation({
  args: {},
  returns: v.object({ key: v.string(), url: v.string() }),
  handler: async (ctx) => {
    const user = await getUserByToken(ctx);
    if (!user) throw new Error("Not authenticated");

    const date = new Date().toISOString().slice(0, 10);
    const key = `uploads/${date}/${crypto.randomUUID()}`;
    return r2.generateUploadUrl(key);
  },
});

export const { syncMetadata, deleteObject, getMetadata } = clientApi;
