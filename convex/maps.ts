import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  getAuthenticatedUserOrNull,
  checkMapOwnership,
  TIER_LIMITS,
  validateMapPayload,
} from "./helpers";
import { vMapPayloadArgs } from "./validators";

export const getMyMaps = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) return [];
    const maps = await ctx.db
      .query("maps")
      .withIndex("by_owner_updated", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
    return maps.map(
      ({ layers: _l, features: _f, groups: _g, ...meta }) => meta
    );
  },
});

export const getMap = query({
  args: { mapId: v.id("maps") },
  handler: async (ctx, { mapId }) => {
    const map = await ctx.db.get(mapId);
    if (!map) return null;
    if (map.isPublic) return map;
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user || map.ownerId !== user._id) return null;
    return map;
  },
});

export const getPublicMaps = query({
  args: {
    tag: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
  },
  handler: async (ctx, { tag, ownerId }) => {
    const PAGE_SIZE = 100;
    const results = [];
    let cursor: string | null = null;
    let done = false;
    while (!done && results.length < PAGE_SIZE) {
      const page = await ctx.db
        .query("maps")
        .withIndex("by_public", (q) => q.eq("isPublic", true))
        .order("desc")
        .paginate({ numItems: PAGE_SIZE, cursor: cursor as any });
      for (const m of page.page) {
        if (tag && !m.tags.includes(tag)) continue;
        if (ownerId && m.ownerId !== ownerId) continue;
        results.push(m);
        if (results.length >= PAGE_SIZE) break;
      }
      done = page.isDone;
      cursor = page.continueCursor;
    }
    const ownerCache = new Map<string, { name?: string; universityLabel?: string }>();
    return await Promise.all(
      results.map(async ({ layers: _l, features: _f, groups: _g, ...meta }) => {
        let owner = ownerCache.get(meta.ownerId);
        if (!owner) {
          const user = await ctx.db.get(meta.ownerId);
          owner = { name: user?.name, universityLabel: user?.universityLabel };
          ownerCache.set(meta.ownerId, owner);
        }
        return { ...meta, ownerName: owner.name, universityLabel: owner.universityLabel };
      })
    );
  },
});

export const createMap = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const existing = await ctx.db
      .query("maps")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const limit = TIER_LIMITS[user.tier ?? "free"] ?? TIER_LIMITS.free;
    if (existing.length >= limit) {
      throw new Error(
        `Map limit reached (${limit}). Upgrade your account to create more maps.`
      );
    }
    const now = Date.now();
    return await ctx.db.insert("maps", {
      ownerId: user._id,
      title: "My map",
      description: "",
      tags: [],
      license: "CC BY",
      center: [2.3, 46.5],
      zoom: 5,
      baseMapId: "osm",
      layers: [{ id: "default", name: "Main layer", visible: true, order: 0 }],
      features: [],
      groups: [],
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveMap = mutation({
  args: {
    mapId: v.id("maps"),
    ...vMapPayloadArgs,
  },
  handler: async (ctx, args) => {
    validateMapPayload(args);
    const { map } = await checkMapOwnership(ctx, args.mapId);
    await ctx.db.patch(map._id, {
      title: args.title,
      description: args.description,
      tags: args.tags,
      license: args.license,
      center: args.center,
      zoom: args.zoom,
      baseMapId: args.baseMapId,
      layers: args.layers,
      features: args.features,
      groups: args.groups,
      updatedAt: Date.now(),
    });
  },
});

export const deleteMap = mutation({
  args: { mapId: v.id("maps") },
  handler: async (ctx, { mapId }) => {
    const { map } = await checkMapOwnership(ctx, mapId);
    await ctx.db.delete(map._id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveThumbnail = mutation({
  args: {
    mapId: v.id("maps"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { mapId, storageId }) => {
    const { map } = await checkMapOwnership(ctx, mapId);
    if (map.thumbnailId) {
      await ctx.storage.delete(map.thumbnailId);
    }
    await ctx.db.patch(map._id, { thumbnailId: storageId });
  },
});

export const getThumbnailUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

export const toggleVisibility = mutation({
  args: { mapId: v.id("maps") },
  handler: async (ctx, { mapId }) => {
    const { map } = await checkMapOwnership(ctx, mapId);
    await ctx.db.patch(map._id, {
      isPublic: !map.isPublic,
      updatedAt: Date.now(),
    });
  },
});

export const migrateFromLocalStorage = mutation({
  args: vMapPayloadArgs,
  handler: async (ctx, args) => {
    validateMapPayload(args);
    const user = await getAuthenticatedUser(ctx);
    const existing = await ctx.db
      .query("maps")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const limit = TIER_LIMITS[user.tier ?? "free"] ?? TIER_LIMITS.free;
    if (existing.length >= limit) {
      throw new Error(`Map limit reached (${limit}). Cannot migrate.`);
    }
    const now = Date.now();
    return await ctx.db.insert("maps", {
      ownerId: user._id,
      title: args.title,
      description: args.description,
      tags: args.tags,
      license: args.license,
      center: args.center,
      zoom: args.zoom,
      baseMapId: args.baseMapId,
      layers: args.layers,
      features: args.features,
      groups: args.groups,
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});
