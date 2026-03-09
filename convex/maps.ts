import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { patchDefined } from "./utils";

const DEFAULT_CENTER = [2.3, 46.5];
const DEFAULT_ZOOM = 5;

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),

    tags: v.optional(v.array(v.string())),
    license: v.optional(v.string()),
    authorId: v.string(),
  },
  handler: async (ctx, args) => {
    const mapId = await ctx.db.insert("maps", {
      title: args.title,
      description: args.description ?? "",
      tags: args.tags ?? [],
      license: args.license ?? "CC BY",
      authorId: args.authorId,
      isPublished: false,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    await ctx.db.insert("layers", {
      mapId,
      name: "Main layer",
      visible: true,
      order: 0,
    });

    return mapId;
  },
});

export const get = query({
  args: { id: v.id("maps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("maps"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),

    tags: v.optional(v.array(v.string())),
    license: v.optional(v.string()),
    center: v.optional(v.array(v.number())),
    zoom: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await patchDefined(ctx.db, id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("maps") },
  handler: async (ctx, args) => {
    const features = await ctx.db
      .query("features")
      .withIndex("by_map", (q) => q.eq("mapId", args.id))
      .collect();
    for (const f of features) await ctx.db.delete(f._id);

    const layers = await ctx.db
      .query("layers")
      .withIndex("by_map", (q) => q.eq("mapId", args.id))
      .collect();
    for (const l of layers) await ctx.db.delete(l._id);

    await ctx.db.delete(args.id);
  },
});
