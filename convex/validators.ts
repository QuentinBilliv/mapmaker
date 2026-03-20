import { v } from "convex/values";

export const vLayer = v.object({
  id: v.string(),
  name: v.string(),
  visible: v.boolean(),
  order: v.number(),
});

export const vGroup = v.object({
  id: v.string(),
  label: v.string(),
  order: v.number(),
});

export const vMapMetadataArgs = {
  title: v.string(),
  description: v.string(),
  tags: v.array(v.string()),
  license: v.string(),
  center: v.array(v.number()),
  zoom: v.number(),
  baseMapId: v.string(),
};

export const vMapPayloadArgs = {
  ...vMapMetadataArgs,
  layers: v.array(vLayer),
  features: v.any(),
  groups: v.array(vGroup),
};
