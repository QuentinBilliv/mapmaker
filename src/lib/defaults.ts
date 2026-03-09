import type { MapData, LayerData } from "./types";

export const DEFAULT_CENTER: [number, number] = [2.3, 46.5];
export const DEFAULT_ZOOM = 5;

export const DEFAULT_MAP: MapData = {
  id: "local",
  title: "New map",
  description: "",
  tags: [],
  license: "CC BY",
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
};

export const DEFAULT_LAYER: LayerData = {
  id: "default",
  name: "Main layer",
  visible: true,
  order: 0,
};
