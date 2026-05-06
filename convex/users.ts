import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { TIER_LIMITS, MAX_DISPLAY_NAME, normalizeName } from "./shared";

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
    const trimmed = name.trim().slice(0, MAX_DISPLAY_NAME);
    if (!trimmed) throw new Error("Display name cannot be empty");
    const lower = normalizeName(trimmed);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_name_lower", (q) => q.eq("nameLower", lower))
      .first();
    if (existing && existing._id !== userId) {
      throw new Error("This display name is already taken. Try another.");
    }
    await ctx.db.patch(userId, { name: trimmed, nameLower: lower });
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

export const backfillNameLower = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;
    for (const u of users) {
      if (!u.name) continue;
      if (u.nameLower) continue;
      await ctx.db.patch(u._id, { nameLower: normalizeName(u.name) });
      updated += 1;
    }
    return { total: users.length, updated };
  },
});

export const assignPlaceholderNames = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let assigned = 0;
    for (const u of users) {
      if (u.name && u.name.trim().length > 0) continue;
      let candidate = "";
      for (let attempt = 0; attempt < 50; attempt++) {
        const n = 10000 + Math.floor(Math.random() * 90000);
        const tryName = `user${n}`;
        const existing = await ctx.db
          .query("users")
          .withIndex("by_name_lower", (q) => q.eq("nameLower", normalizeName(tryName)))
          .first();
        if (!existing) {
          candidate = tryName;
          break;
        }
      }
      if (!candidate) continue;
      await ctx.db.patch(u._id, { name: candidate, nameLower: normalizeName(candidate) });
      const maps = await ctx.db
        .query("maps")
        .withIndex("by_owner", (q) => q.eq("ownerId", u._id))
        .collect();
      for (const map of maps) {
        await ctx.db.patch(map._id, {
          ownerName: candidate,
          searchText: [map.title, ...map.tags, candidate].filter(Boolean).join(" "),
        });
      }
      assigned += 1;
    }
    return { total: users.length, assigned };
  },
});
