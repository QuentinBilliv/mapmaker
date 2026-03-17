import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthenticatedUser } from "./helpers";

export const setUserTier = mutation({
  args: {
    targetEmail: v.string(),
    tier: v.union(v.literal("free"), v.literal("paid"), v.literal("admin")),
  },
  handler: async (ctx, { targetEmail, tier }) => {
    const admin = await getAuthenticatedUser(ctx);
    if (admin.tier !== "admin") throw new Error("Admin access required");
    const target = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", targetEmail))
      .unique();
    if (!target) throw new Error("User not found");
    await ctx.db.patch(target._id, { tier });
    console.info(
      `[audit] setUserTier: admin=${admin.email} target=${targetEmail} tier=${tier}`
    );
  },
});

export const setUniversityLabel = mutation({
  args: {
    targetEmail: v.string(),
    universityLabel: v.optional(v.string()),
  },
  handler: async (ctx, { targetEmail, universityLabel }) => {
    const admin = await getAuthenticatedUser(ctx);
    if (admin.tier !== "admin") throw new Error("Admin access required");
    const target = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", targetEmail))
      .unique();
    if (!target) throw new Error("User not found");
    await ctx.db.patch(target._id, { universityLabel });
    console.info(
      `[audit] setUniversityLabel: admin=${admin.email} target=${targetEmail} label=${universityLabel ?? "(removed)"}`
    );
  },
});
