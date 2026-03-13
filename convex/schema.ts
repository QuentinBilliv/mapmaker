import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  maps: defineTable({
    title: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    license: v.string(),
    authorId: v.string(),
    isPublished: v.boolean(),
    center: v.array(v.number()),
    zoom: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_published", ["isPublished"]),

  layers: defineTable({
    mapId: v.id("maps"),
    name: v.string(),
    visible: v.boolean(),
    order: v.number(),
  }).index("by_map", ["mapId"]),

  features: defineTable({
    mapId: v.id("maps"),
    layerId: v.id("layers"),
    type: v.union(
      v.literal("polygon"),
      v.literal("polyline"),
      v.literal("point"),
      v.literal("text")
    ),
    label: v.string(),
    color: v.string(),
    opacity: v.number(),
    sourceText: v.string(),
    sourceUrl: v.optional(v.string()),
    geometry: v.string(),
  })
    .index("by_map", ["mapId"])
    .index("by_layer", ["layerId"]),
});
