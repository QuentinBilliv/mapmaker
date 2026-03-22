import type { MapData, LayerData, FeatureData, GroupData, LegendEntry } from "./types";
import type { BaseMap } from "./map-style";
import { BASE_MAPS } from "./map-style";
import { DEFAULT_MAP, DEFAULT_LAYER } from "./defaults";

const STORAGE_KEY = "mapmaker:current";
const VERSION = 1;

export type StorageError = "quota_exceeded" | "save_failed" | "load_corrupted";

type StorageErrorCallback = (error: StorageError) => void;

let onStorageError: StorageErrorCallback | null = null;

export function setStorageErrorHandler(handler: StorageErrorCallback) {
  onStorageError = handler;
}

interface StoredState {
  version: number;
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  groups: GroupData[];
  legendEntries: LegendEntry[];
  baseMapId: string;
}

export function saveToLocalStorage(
  map: MapData,
  layers: LayerData[],
  features: FeatureData[],
  groups: GroupData[],
  legendEntries: LegendEntry[],
  baseMapId: string,
): void {
  try {
    const state: StoredState = { version: VERSION, map, layers, features, groups, legendEntries, baseMapId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    const type = e instanceof DOMException && e.name === "QuotaExceededError"
      ? "quota_exceeded"
      : "save_failed";
    onStorageError?.(type);
  }
}

export function loadFromLocalStorage(): {
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  groups: GroupData[];
  legendEntries: LegendEntry[];
  baseMap: BaseMap;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state: StoredState = JSON.parse(raw);
    if (state.version !== VERSION) return null;
    if (!state.map || !Array.isArray(state.layers) || !Array.isArray(state.features)) return null;
    const VALID_TYPES = new Set(["polygon", "polyline", "point", "text"]);
    const validFeatures = state.features.filter(
      (f) => f && typeof f.id === "string" && VALID_TYPES.has(f.type) && f.geometry && typeof f.geometry.type === "string",
    );
    if (validFeatures.length === 0 && state.features.length > 0) return null;
    const baseMap = BASE_MAPS.find((b) => b.id === state.baseMapId) ?? BASE_MAPS[0];
    return {
      map: { ...DEFAULT_MAP, ...state.map },
      layers: state.layers.length > 0 ? state.layers : [DEFAULT_LAYER],
      features: validFeatures,
      groups: state.groups ?? [],
      legendEntries: (state as StoredState).legendEntries ?? [],
      baseMap,
    };
  } catch {
    onStorageError?.("load_corrupted");
    return null;
  }
}
