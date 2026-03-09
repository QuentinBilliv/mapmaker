import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { patchDefined } from "./utils";

export const list = query({
  args: { mapId: v.id("maps") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("features")
      .withIndex("by_map", (q) => q.eq("mapId", args.mapId))
      .collect();
  },
});

export const create = mutation({
  args: {
    mapId: v.id("maps"),
    layerId: v.id("layers"),
    type: v.union(
      v.literal("polygon"),
      v.literal("polyline"),
      v.literal("point")
    ),
    label: v.string(),
    color: v.string(),
    opacity: v.number(),
    sourceText: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    geometry: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("features", {
      ...args,
      sourceText: args.sourceText ?? "",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("features"),
    label: v.optional(v.string()),
    color: v.optional(v.string()),
    opacity: v.optional(v.number()),
    sourceText: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    geometry: v.optional(v.string()),
    layerId: v.optional(v.id("layers")),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await patchDefined(ctx.db, id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("features") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
