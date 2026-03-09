import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { patchDefined } from "./utils";

export const list = query({
  args: { mapId: v.id("maps") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("layers")
      .withIndex("by_map", (q) => q.eq("mapId", args.mapId))
      .collect();
  },
});

export const create = mutation({
  args: {
    mapId: v.id("maps"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("layers")
      .withIndex("by_map", (q) => q.eq("mapId", args.mapId))
      .collect();

    return await ctx.db.insert("layers", {
      mapId: args.mapId,
      name: args.name,
      visible: true,
      order: existing.length,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("layers"),
    name: v.optional(v.string()),
    visible: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await patchDefined(ctx.db, id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("layers") },
  handler: async (ctx, args) => {
    const features = await ctx.db
      .query("features")
      .withIndex("by_layer", (q) => q.eq("layerId", args.id))
      .collect();
    for (const f of features) await ctx.db.delete(f._id);

    await ctx.db.delete(args.id);
  },
});
