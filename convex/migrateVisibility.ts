import { mutation } from "./_generated/server";

export const migrateIsPublicToVisibility = mutation({
  args: {},
  handler: async (ctx) => {
    const maps = await ctx.db.query("maps").collect();
    const ownerCache = new Map<string, string | undefined>();
    let migrated = 0;
    for (const map of maps) {
      const raw = map as Record<string, unknown>;
      const needsVisibility = !raw.visibility;
      const needsSearchText = !raw.searchText;
      if (!needsVisibility && !needsSearchText) continue;

      let ownerName = ownerCache.get(map.ownerId);
      if (ownerName === undefined) {
        const owner = await ctx.db.get(map.ownerId);
        ownerName = owner?.name;
        ownerCache.set(map.ownerId, ownerName);
      }

      const patch: Record<string, unknown> = {};
      if (needsVisibility) {
        patch.visibility = raw.isPublic ? "public" : "private";
      }
      if (needsSearchText) {
        const tags = Array.isArray(map.tags) ? map.tags : [];
        patch.searchText = [map.title, ...tags, ownerName].filter(Boolean).join(" ");
        patch.ownerName = ownerName;
      }
      await ctx.db.patch(map._id, patch);
      migrated++;
    }
    return { migrated };
  },
});
