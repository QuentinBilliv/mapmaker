import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import {
  getAuthenticatedUser,
  getAuthenticatedUserOrNull,
  checkMapOwnership,
  TIER_LIMITS,
  validateMapMetadata,
  validateMapPayload,
} from "./helpers";
import { vMapMetadataArgs, vMapPayloadArgs } from "./validators";

type Visibility = "private" | "unlisted" | "public";

function resolveVisibility(map: { visibility?: Visibility; isPublic?: boolean }): Visibility {
  if (map.visibility) return map.visibility;
  return map.isPublic ? "public" : "private";
}

function buildSearchText(title: string, tags: string[], ownerName?: string): string {
  return [title, ...tags, ownerName].filter(Boolean).join(" ");
}

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
    return maps
      .filter((m) => !m.deletedAt)
      .map(({ layers: _l, features: _f, groups: _g, dataFileId: _d, ...meta }) => ({
        ...meta,
        visibility: resolveVisibility(meta),
      }));
  },
});

export const getMap = query({
  args: { mapId: v.id("maps") },
  handler: async (ctx, { mapId }) => {
    const map = await ctx.db.get(mapId);
    if (!map || map.deletedAt) return null;
    const vis = resolveVisibility(map);
    if (vis !== "public" && vis !== "unlisted") {
      const user = await getAuthenticatedUserOrNull(ctx);
      if (!user || map.ownerId !== user._id) return null;
    }
    if (map.dataFileId) {
      const dataFileUrl = await ctx.storage.getUrl(map.dataFileId);
      const { layers: _l, features: _f, groups: _g, ...meta } = map;
      return { ...meta, visibility: vis, dataFileUrl };
    }
    return { ...map, visibility: vis };
  },
});

const PUBLIC_PAGE_SIZE = 9;

export const browsePublicMaps = query({
  args: {
    paginationOpts: paginationOptsValidator,
    ownerId: v.optional(v.id("users")),
  },
  handler: async (ctx, { paginationOpts, ownerId }) => {
    const page = await ctx.db
      .query("maps")
      .withIndex("by_visibility", (idx) => idx.eq("visibility", "public"))
      .order("desc")
      .paginate(paginationOpts);

    const filtered = page.page.filter((m) => {
      if (m.deletedAt) return false;
      if (ownerId && m.ownerId !== ownerId) return false;
      return true;
    });

    const ownerCache = new Map<string, { name?: string; universityLabel?: string }>();
    const results = await Promise.all(
      filtered.map(async ({ layers: _l, features: _f, groups: _g, dataFileId: _d, ...meta }) => {
        let owner = ownerCache.get(meta.ownerId);
        if (!owner) {
          const user = await ctx.db.get(meta.ownerId);
          owner = { name: user?.name, universityLabel: user?.universityLabel };
          ownerCache.set(meta.ownerId, owner);
        }
        return { ...meta, ownerName: owner.name, universityLabel: owner.universityLabel };
      })
    );

    return {
      ...page,
      page: results,
    };
  },
});

export const searchPublicMaps = query({
  args: {
    query: v.string(),
    ownerId: v.optional(v.id("users")),
  },
  handler: async (ctx, { query: searchQuery, ownerId }) => {
    const results = await ctx.db
      .query("maps")
      .withSearchIndex("search_public", (s) => {
        const base = s.search("searchText", searchQuery).eq("visibility", "public");
        return ownerId ? base.eq("ownerId", ownerId) : base;
      })
      .take(PUBLIC_PAGE_SIZE);

    const filtered = results.filter((m) => !m.deletedAt);

    const ownerCache = new Map<string, { name?: string; universityLabel?: string }>();
    return await Promise.all(
      filtered.map(async ({ layers: _l, features: _f, groups: _g, dataFileId: _d, ...meta }) => {
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
    const allMaps = await ctx.db
      .query("maps")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const existing = allMaps.filter((m) => !m.deletedAt);
    const limit = TIER_LIMITS[user.tier ?? "free"] ?? TIER_LIMITS.free;
    if (existing.length >= limit) {
      throw new Error(
        `Map limit reached (${limit}). Upgrade your account to create more maps.`
      );
    }
    const now = Date.now();
    const title = "My map";
    return await ctx.db.insert("maps", {
      ownerId: user._id,
      title,
      description: "",
      tags: [],
      license: "CC BY",
      center: [2.3, 46.5],
      zoom: 5,
      baseMapId: "osm",
      layers: [{ id: "default", name: "Main layer", visible: true, order: 0 }],
      features: [],
      groups: [],
      visibility: "private",
      ownerName: user.name,
      searchText: buildSearchText(title, [], user.name),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createMapFromTemplate = mutation({
  args: { templateMapId: v.id("maps") },
  handler: async (ctx, { templateMapId }) => {
    const user = await getAuthenticatedUser(ctx);
    const allMaps = await ctx.db
      .query("maps")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const existing = allMaps.filter((m) => !m.deletedAt);
    const limit = TIER_LIMITS[user.tier ?? "free"] ?? TIER_LIMITS.free;
    if (existing.length >= limit) {
      throw new Error(
        `Map limit reached (${limit}). Upgrade your account to create more maps.`
      );
    }
    const template = await ctx.db.get(templateMapId);
    if (!template || template.deletedAt) {
      throw new Error("Template not found");
    }
    const now = Date.now();
    const title = `${template.title} (copy)`;
    return await ctx.db.insert("maps", {
      ownerId: user._id,
      title,
      description: template.description,
      tags: template.tags,
      license: template.license,
      center: template.center,
      zoom: template.zoom,
      baseMapId: template.baseMapId,
      layers: template.layers,
      features: template.features,
      groups: template.groups,
      visibility: "private",
      ownerName: user.name,
      searchText: buildSearchText(title, template.tags, user.name),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveMap = mutation({
  args: {
    mapId: v.id("maps"),
    ...vMapMetadataArgs,
    dataFileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    validateMapMetadata(args);
    const { map } = await checkMapOwnership(ctx, args.mapId);
    if (map.dataFileId && map.dataFileId !== args.dataFileId) {
      await ctx.storage.delete(map.dataFileId);
    }
    const owner = await ctx.db.get(map.ownerId);
    const ownerName = owner?.name;
    await ctx.db.patch(map._id, {
      title: args.title,
      description: args.description,
      tags: args.tags,
      license: args.license,
      center: args.center,
      zoom: args.zoom,
      baseMapId: args.baseMapId,
      dataFileId: args.dataFileId,
      layers: undefined,
      features: undefined,
      groups: undefined,
      ownerName,
      searchText: buildSearchText(args.title, args.tags, ownerName),
      updatedAt: Date.now(),
    });
  },
});

export const deleteMap = mutation({
  args: { mapId: v.id("maps") },
  handler: async (ctx, { mapId }) => {
    const { map } = await checkMapOwnership(ctx, mapId);
    if (map.dataFileId) {
      try {
        await ctx.storage.delete(map.dataFileId);
      } catch {
        // Storage file may not exist (e.g. copied from template)
      }
    }
    if (map.thumbnailId) {
      try {
        await ctx.storage.delete(map.thumbnailId);
      } catch {
        // Thumbnail may not exist
      }
    }
    await ctx.db.patch(map._id, { deletedAt: Date.now() });
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

export const setVisibility = mutation({
  args: {
    mapId: v.id("maps"),
    visibility: v.union(v.literal("private"), v.literal("unlisted"), v.literal("public")),
  },
  handler: async (ctx, { mapId, visibility }) => {
    const { map } = await checkMapOwnership(ctx, mapId);
    await ctx.db.patch(map._id, {
      visibility,
      updatedAt: Date.now(),
    });
  },
});

export const migrateFromLocalStorage = mutation({
  args: vMapPayloadArgs,
  handler: async (ctx, args) => {
    validateMapPayload(args);
    const user = await getAuthenticatedUser(ctx);
    const allMaps = await ctx.db
      .query("maps")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const existing = allMaps.filter((m) => !m.deletedAt);
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
      visibility: "private",
      ownerName: user.name,
      searchText: buildSearchText(args.title, args.tags, user.name),
      createdAt: now,
      updatedAt: now,
    });
  },
});
