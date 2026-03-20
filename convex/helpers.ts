import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  TIER_LIMITS,
  MAX_TITLE,
  MAX_DESCRIPTION,
  MAX_TAG,
  MAX_TAGS,
  MAX_LICENSE,
  MAX_BASE_MAP_ID,
  MAX_FEATURES,
  MAX_LAYERS,
  MAX_GROUPS,
  MAX_MAP_PAYLOAD,
} from "./shared";

export { TIER_LIMITS };

export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return user;
}

export async function getAuthenticatedUserOrNull(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

export async function checkMapOwnership(
  ctx: QueryCtx | MutationCtx,
  mapId: Id<"maps">
) {
  const user = await getAuthenticatedUser(ctx);
  const map = await ctx.db.get(mapId);
  if (!map || map.deletedAt) throw new Error("Map not found");
  if (map.ownerId !== user._id) throw new Error("Not authorized");
  return { user, map };
}

export function validateMapMetadata(args: {
  title: string;
  description: string;
  tags: string[];
  license: string;
  baseMapId: string;
}) {
  if (args.title.length > MAX_TITLE) throw new Error("Title too long");
  if (args.description.length > MAX_DESCRIPTION) throw new Error("Description too long");
  if (args.tags.length > MAX_TAGS) throw new Error("Too many tags");
  for (const tag of args.tags) {
    if (tag.length > MAX_TAG) throw new Error("Tag too long");
  }
  if (args.license.length > MAX_LICENSE) throw new Error("License too long");
  if (args.baseMapId.length > MAX_BASE_MAP_ID) throw new Error("Invalid base map ID");
}

export function validateMapPayload(args: {
  title: string;
  description: string;
  tags: string[];
  license: string;
  baseMapId: string;
  layers: unknown;
  features: unknown;
  groups: unknown;
}) {
  validateMapMetadata(args);
  if (!Array.isArray(args.features)) throw new Error("Features must be an array");
  if (args.features.length > MAX_FEATURES) throw new Error("Too many features");
  if (!Array.isArray(args.layers)) throw new Error("Layers must be an array");
  if (args.layers.length > MAX_LAYERS) throw new Error("Too many layers");
  if (!Array.isArray(args.groups)) throw new Error("Groups must be an array");
  if (args.groups.length > MAX_GROUPS) throw new Error("Too many groups");
  const payloadSize = JSON.stringify(args).length;
  if (payloadSize > MAX_MAP_PAYLOAD) throw new Error("Map data too large");
}
