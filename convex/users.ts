import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { TIER_LIMITS } from "./shared";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const tier = user.tier ?? "free";
    const mapLimit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
    return { ...user, tier, mapLimit };
  },
});

export const updateName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) throw new Error("Name cannot be empty");
    await ctx.db.patch(userId, { name: trimmed });
    const maps = await ctx.db
      .query("maps")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    for (const map of maps) {
      await ctx.db.patch(map._id, {
        ownerName: trimmed,
        searchText: [map.title, ...map.tags, trimmed].filter(Boolean).join(" "),
      });
    }
  },
});
