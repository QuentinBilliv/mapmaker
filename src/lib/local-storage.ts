import type { MapData, LayerData, FeatureData, GroupData } from "./types";
import type { BaseMap } from "./map-style";
import { BASE_MAPS } from "./map-style";
import { DEFAULT_MAP, DEFAULT_LAYER } from "./defaults";

const STORAGE_KEY = "mapmaker:current";
const VERSION = 1;

interface StoredState {
  version: number;
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  groups: GroupData[];
  baseMapId: string;
}

export function saveToLocalStorage(
  map: MapData,
  layers: LayerData[],
  features: FeatureData[],
  groups: GroupData[],
  baseMapId: string,
): void {
  try {
    const state: StoredState = { version: VERSION, map, layers, features, groups, baseMapId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function loadFromLocalStorage(): {
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  groups: GroupData[];
  baseMap: BaseMap;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state: StoredState = JSON.parse(raw);
    if (state.version !== VERSION) return null;
    if (!state.map || !Array.isArray(state.layers) || !Array.isArray(state.features)) return null;
    const validFeatures = state.features.filter(
      (f) => f && typeof f.id === "string" && typeof f.type === "string" && f.geometry,
    );
    if (validFeatures.length === 0 && state.features.length > 0) return null;
    const baseMap = BASE_MAPS.find((b) => b.id === state.baseMapId) ?? BASE_MAPS[0];
    return {
      map: { ...DEFAULT_MAP, ...state.map },
      layers: state.layers.length > 0 ? state.layers : [DEFAULT_LAYER],
      features: validFeatures,
      groups: state.groups ?? [],
      baseMap,
    };
  } catch {
    return null;
  }
}
