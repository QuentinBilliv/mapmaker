import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    tier: v.optional(
      v.union(v.literal("free"), v.literal("paid"), v.literal("admin")),
    ),
    universityLabel: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  }).index("email", ["email"]),

  maps: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    license: v.optional(v.string()),
    center: v.array(v.number()),
    zoom: v.number(),
    baseMapId: v.string(),
    styleOptions: v.optional(
      v.object({
        noLabels: v.optional(v.boolean()),
        noBorders: v.optional(v.boolean()),
        noRoads: v.optional(v.boolean()),
      }),
    ),
    layers: v.optional(v.any()),
    features: v.optional(v.any()),
    groups: v.optional(v.any()),
    legendEntries: v.optional(v.any()),
    choropleth: v.optional(v.any()),
    dataFileId: v.optional(v.id("_storage")),
    dataFileSize: v.optional(v.number()),
    zoomLocked: v.optional(v.boolean()),
    panLocked: v.optional(v.boolean()),
    isPublic: v.optional(v.boolean()),
    visibility: v.optional(
      v.union(v.literal("private"), v.literal("unlisted"), v.literal("public")),
    ),
    ownerName: v.optional(v.string()),
    searchText: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    thumbnailId: v.optional(v.id("_storage")),
  })
    .index("by_owner", ["ownerId"])
    .index("by_public", ["isPublic", "updatedAt"])
    .index("by_visibility", ["visibility", "updatedAt"])
    .index("by_owner_updated", ["ownerId", "updatedAt"])
    .searchIndex("search_public", {
      searchField: "searchText",
      filterFields: ["visibility", "ownerId"],
    }),

  reports: defineTable({
    mapId: v.id("maps"),
    reason: v.string(),
    details: v.optional(v.string()),
    createdAt: v.number(),
    resolved: v.optional(v.boolean()),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
  }).index("by_map", ["mapId"]).index("by_resolved", ["resolved", "createdAt"]),
});
