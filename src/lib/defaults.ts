import type { MapData } from "./types";

export const LICENSES = ["CC BY", "CC BY-SA", "CC BY-NC", "Public domain"] as const;

export const DEFAULT_CENTER: [number, number] = [0, 20];
export const DEFAULT_ZOOM = 1;

export const COLORS: Record<string, string> = {
  primary: "#1a1a1a",
  white: "#ffffff",
  accent: "#3b82f6",
  mapBackground: "#f8f4f0",
};

export const DEFAULT_BORDER_WIDTH = 6;
export const FEATURE_LIMIT = 50;
export const ANONYMOUS_FEATURE_LIMIT = 5;
export const MAX_MAP_PAYLOAD = 5_000_000;

export const DEFAULT_MAP: MapData = {
  id: "local",
  title: "New map",
  description: "",
  tags: [],
  license: "CC BY",
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
};
