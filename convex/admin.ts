import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthenticatedUser } from "./helpers";

export const setUserTier = mutation({
  args: {
    targetEmail: v.string(),
    tier: v.union(v.literal("free"), v.literal("paid"), v.literal("admin")),
  },
  handler: async (ctx, { targetEmail, tier }) => {
    const admin = await getAuthenticatedUser(ctx);
    if (admin.tier !== "admin") throw new Error("Admin access required");
    const target = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", targetEmail))
      .unique();
    if (!target) throw new Error("User not found");
    await ctx.db.patch(target._id, { tier });
    console.info(
      `[audit] setUserTier: admin=${admin.email} target=${targetEmail} tier=${tier}`
    );
  },
});

export const cleanOrphanedStorage = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await getAuthenticatedUser(ctx);
    if (admin.tier !== "admin") throw new Error("Admin access required");
    const maps = await ctx.db.query("maps").collect();
    const usedIds = new Set<string>();
    for (const m of maps) {
      if (m.dataFileId) usedIds.add(m.dataFileId);
      if (m.thumbnailId) usedIds.add(m.thumbnailId);
    }
    let deleted = 0;
    let total = 0;
    let cursor = null;
    const BATCH_SIZE = 100;
    let hasMore = true;
    while (hasMore) {
      const batch = await ctx.db.system
        .query("_storage")
        .paginate({ numItems: BATCH_SIZE, cursor: cursor as never });
      total += batch.page.length;
      for (const file of batch.page) {
        if (!usedIds.has(file._id)) {
          await ctx.storage.delete(file._id);
          deleted++;
        }
      }
      hasMore = !batch.isDone;
      cursor = batch.continueCursor;
    }
    console.info(`[audit] cleanOrphanedStorage: admin=${admin.email} deleted=${deleted} files`);
    return { deleted, total };
  },
});

export const setUniversityLabel = mutation({
  args: {
    targetEmail: v.string(),
    universityLabel: v.optional(v.string()),
  },
  handler: async (ctx, { targetEmail, universityLabel }) => {
    const admin = await getAuthenticatedUser(ctx);
    if (admin.tier !== "admin") throw new Error("Admin access required");
    const target = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", targetEmail))
      .unique();
    if (!target) throw new Error("User not found");
    if (universityLabel && universityLabel.length > 200) throw new Error("University label too long (max 200 characters)");
    await ctx.db.patch(target._id, { universityLabel });
    console.info(
      `[audit] setUniversityLabel: admin=${admin.email} target=${targetEmail} label=${universityLabel ?? "(removed)"}`
    );
  },
});
