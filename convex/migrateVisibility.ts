import { mutation } from "./_generated/server";
import { getAuthenticatedUser } from "./helpers";

export const migrateIsPublicToVisibility = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.tier !== "admin") throw new Error("Admin only");
    const maps = await ctx.db.query("maps").collect();
    let migrated = 0;
    for (const map of maps) {
      if ((map as Record<string, unknown>).visibility) continue;
      const isPublic = (map as Record<string, unknown>).isPublic;
      await ctx.db.patch(map._id, {
        visibility: isPublic ? "public" : "private",
      } as Record<string, unknown>);
      migrated++;
    }
    return { migrated };
  },
});
