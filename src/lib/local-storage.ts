import type { MapData, FeatureData, GroupData, LegendEntry, ChoroplethData } from "./types";
import type { BaseMap, StyleOptions } from "./map-style";
import { findBaseMap } from "./map-style";
import { DEFAULT_MAP } from "./defaults";

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
  features: FeatureData[];
  groups: GroupData[];
  legendEntries: LegendEntry[];
  baseMapId: string;
  styleOptions?: StyleOptions;
  choropleth?: ChoroplethData;
}

export function saveToLocalStorage(
  map: MapData,
  features: FeatureData[],
  groups: GroupData[],
  legendEntries: LegendEntry[],
  baseMapId: string,
  styleOptions?: StyleOptions,
  choropleth?: ChoroplethData,
): void {
  try {
    const state: StoredState = { version: VERSION, map, features, groups, legendEntries, baseMapId, styleOptions, choropleth };
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
  features: FeatureData[];
  groups: GroupData[];
  legendEntries: LegendEntry[];
  baseMap: BaseMap;
  styleOptions?: StyleOptions;
  choropleth?: ChoroplethData;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (state.version !== VERSION) return null;
    if (!state.map || !Array.isArray(state.features)) return null;
    const VALID_TYPES = new Set(["polygon", "polyline", "point", "text"]);
    const validFeatures = state.features.filter(
      (f: FeatureData) => f && typeof f.id === "string" && VALID_TYPES.has(f.type) && f.geometry && typeof f.geometry.type === "string",
    );
    if (validFeatures.length === 0 && state.features.length > 0) return null;
    const baseMap = findBaseMap(state.baseMapId);
    return {
      map: { ...DEFAULT_MAP, ...state.map },
      features: validFeatures,
      groups: state.groups ?? [],
      legendEntries: state.legendEntries ?? [],
      baseMap,
      styleOptions: state.styleOptions,
      choropleth: state.choropleth,
    };
  } catch {
    onStorageError?.("load_corrupted");
    return null;
  }
}
