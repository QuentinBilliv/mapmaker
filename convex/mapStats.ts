import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthenticatedUser, getAuthenticatedUserOrNull } from "./helpers";

type Visibility = "private" | "unlisted" | "public";

function resolveVisibility(map: { visibility?: Visibility; isPublic?: boolean }): Visibility {
  if (map.visibility) return map.visibility;
  return map.isPublic ? "public" : "private";
}

export const recordView = mutation({
  args: { mapId: v.id("maps") },
  handler: async (ctx, { mapId }) => {
    const map = await ctx.db.get(mapId);
    if (!map) return;
    if (resolveVisibility(map) === "private") {
      const user = await getAuthenticatedUserOrNull(ctx);
      if (!user || user._id !== map.ownerId) return;
    }
    const existing = await ctx.db
      .query("mapStats")
      .withIndex("by_map", (q) => q.eq("mapId", mapId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { viewCount: existing.viewCount + 1 });
    } else {
      await ctx.db.insert("mapStats", { mapId, viewCount: 1, starCount: 0 });
    }
  },
});

export const toggleStar = mutation({
  args: { mapId: v.id("maps") },
  handler: async (ctx, { mapId }) => {
    const user = await getAuthenticatedUser(ctx);
    const map = await ctx.db.get(mapId);
    if (!map) throw new Error("Map not found");
    if (resolveVisibility(map) === "private" && map.ownerId !== user._id) {
      throw new Error("Map not found");
    }
    const existingStar = await ctx.db
      .query("mapStars")
      .withIndex("by_user_map", (q) => q.eq("userId", user._id).eq("mapId", mapId))
      .first();
    const stats = await ctx.db
      .query("mapStats")
      .withIndex("by_map", (q) => q.eq("mapId", mapId))
      .first();
    if (existingStar) {
      await ctx.db.delete(existingStar._id);
      if (stats) {
        const next = Math.max(0, stats.starCount - 1);
        await ctx.db.patch(stats._id, { starCount: next });
        await ctx.db.patch(mapId, { starCount: next });
      } else {
        await ctx.db.patch(mapId, { starCount: 0 });
      }
      return { starred: false };
    }
    await ctx.db.insert("mapStars", { userId: user._id, mapId, createdAt: Date.now() });
    if (stats) {
      const next = stats.starCount + 1;
      await ctx.db.patch(stats._id, { starCount: next });
      await ctx.db.patch(mapId, { starCount: next });
    } else {
      await ctx.db.insert("mapStats", { mapId, viewCount: 0, starCount: 1 });
      await ctx.db.patch(mapId, { starCount: 1 });
    }
    return { starred: true };
  },
});

export const getStats = query({
  args: { mapId: v.id("maps") },
  handler: async (ctx, { mapId }) => {
    const map = await ctx.db.get(mapId);
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!map || (resolveVisibility(map) === "private" && (!user || user._id !== map.ownerId))) {
      return { viewCount: 0, starCount: 0, isStarredByMe: false };
    }
    const stats = await ctx.db
      .query("mapStats")
      .withIndex("by_map", (q) => q.eq("mapId", mapId))
      .first();
    let isStarredByMe = false;
    if (user) {
      const star = await ctx.db
        .query("mapStars")
        .withIndex("by_user_map", (q) => q.eq("userId", user._id).eq("mapId", mapId))
        .first();
      isStarredByMe = star !== null;
    }
    return {
      viewCount: stats?.viewCount ?? 0,
      starCount: stats?.starCount ?? 0,
      isStarredByMe,
    };
  },
});

export const getStatsBatch = query({
  args: { mapIds: v.array(v.id("maps")) },
  handler: async (ctx, { mapIds }) => {
    const user = await getAuthenticatedUserOrNull(ctx);
    const result: Record<string, { viewCount: number; starCount: number; isStarredByMe: boolean }> = {};
    await Promise.all(
      mapIds.map(async (mapId) => {
        const map = await ctx.db.get(mapId);
        if (!map || (resolveVisibility(map) === "private" && (!user || user._id !== map.ownerId))) {
          result[mapId] = { viewCount: 0, starCount: 0, isStarredByMe: false };
          return;
        }
        const stats = await ctx.db
          .query("mapStats")
          .withIndex("by_map", (q) => q.eq("mapId", mapId))
          .first();
        let isStarredByMe = false;
        if (user) {
          const star = await ctx.db
            .query("mapStars")
            .withIndex("by_user_map", (q) => q.eq("userId", user._id).eq("mapId", mapId))
            .first();
          isStarredByMe = star !== null;
        }
        result[mapId] = {
          viewCount: stats?.viewCount ?? 0,
          starCount: stats?.starCount ?? 0,
          isStarredByMe,
        };
      }),
    );
    return result;
  },
});

export const getMyStarredMaps = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) return [];
    const stars = await ctx.db
      .query("mapStars")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    const maps = await Promise.all(stars.map((s) => ctx.db.get(s.mapId)));
    return maps
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .filter((m) => m.ownerId === user._id || resolveVisibility(m) === "public")
      .map(({ layers: _l, features: _f, groups: _g, dataFileId: _d, ...meta }) => ({
        ...meta,
        visibility: resolveVisibility(meta),
      }));
  },
});

export const _seedViewCounts = internalMutation({
  args: { entries: v.array(v.object({ mapId: v.id("maps"), count: v.number() })) },
  handler: async (ctx, { entries }) => {
    let updated = 0;
    let inserted = 0;
    for (const { mapId, count } of entries) {
      const existing = await ctx.db
        .query("mapStats")
        .withIndex("by_map", (q) => q.eq("mapId", mapId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { viewCount: count });
        updated += 1;
      } else {
        await ctx.db.insert("mapStats", { mapId, viewCount: count, starCount: 0 });
        inserted += 1;
      }
    }
    return { updated, inserted };
  },
});
