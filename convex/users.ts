import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { TIER_LIMITS } from "./shared";

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
