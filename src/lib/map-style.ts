import type { StyleSpecification, LayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import { COLORS } from "./defaults";

export interface BaseMap {
  id: string;
  label: string;
  style: StyleSpecification | string;
  vector?: boolean;
}

export interface StyleOptions {
  noLabels?: boolean;
  noBorders?: boolean;
  noRoads?: boolean;
}

const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

function rasterStyle(
  name: string,
  tiles: string[],
  attribution: string,
  maxzoom = 19
): StyleSpecification {
  return {
    version: 8,
    name,
    glyphs: GLYPHS,
    sources: {
      basemap: { type: "raster", tiles, tileSize: 256, attribution, maxzoom },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": COLORS.mapBackground } },
      { id: "basemap", type: "raster", source: "basemap" },
    ],
  };
}

export const BASE_MAPS: BaseMap[] = [
  {
    id: "liberty",
    label: "Liberty",
    style: "https://tiles.openfreemap.org/styles/liberty",
    vector: true,
  },
  {
    id: "bright",
    label: "Bright",
    style: "https://tiles.openfreemap.org/styles/bright",
    vector: true,
  },
  {
    id: "positron",
    label: "Positron",
    style: "https://tiles.openfreemap.org/styles/positron",
    vector: true,
  },
  {
    id: "osm",
    label: "OpenStreetMap",
    style: rasterStyle(
      "OpenStreetMap",
      ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    ),
  },
  {
    id: "voyager",
    label: "Voyager",
    style: rasterStyle(
      "CartoDB Voyager",
      ["https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"],
      '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    ),
  },
  {
    id: "light",
    label: "Light",
    style: rasterStyle(
      "CartoDB Light",
      ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"],
      '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    ),
  },
  {
    id: "dark",
    label: "Dark",
    style: rasterStyle(
      "CartoDB Dark",
      ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
      '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    ),
  },
  {
    id: "topo",
    label: "Topographic",
    style: rasterStyle(
      "OpenTopoMap",
      ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      17
    ),
  },
  {
    id: "natgeo",
    label: "National Geographic",
    style: rasterStyle(
      "ESRI NatGeo",
      ["https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"],
      '&copy; <a href="https://www.esri.com/">Esri</a> &copy; National Geographic',
    ),
  },
  {
    id: "satellite",
    label: "Satellite",
    style: rasterStyle(
      "ESRI Satellite",
      ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      '&copy; <a href="https://www.esri.com/">Esri</a>'
    ),
  },
];

export const DEFAULT_BASE_MAP = BASE_MAPS[0];

const LEGACY_BASE_MAP_IDS: Record<string, string> = {
  "liberty-no-labels": "liberty",
  "bright-no-labels": "bright",
  "positron-no-labels": "positron",
};

export function findBaseMap(id: string): BaseMap {
  const resolved = LEGACY_BASE_MAP_IDS[id] ?? id;
  return BASE_MAPS.find((b) => b.id === resolved) ?? BASE_MAPS[0];
}

function hasTextField(layer: LayerSpecification): boolean {
  return "layout" in layer && !!layer.layout && "text-field" in layer.layout;
}

const ROAD_PREFIXES = [
  "road_", "road-",
  "highway_", "highway-",
  "tunnel_", "tunnel-",
  "bridge_", "bridge-",
  "aeroway_", "aeroway-",
  "railway_", "railway-",
  "ferry",
];

function applyStyleOptions(style: StyleSpecification, options: StyleOptions): StyleSpecification {
  if (!options.noLabels && !options.noBorders && !options.noRoads) return style;
  return {
    ...style,
    layers: style.layers.filter((l) => {
      if (options.noLabels && hasTextField(l)) return false;
      if (options.noBorders && l.id.startsWith("boundary")) return false;
      if (options.noRoads && ROAD_PREFIXES.some((p) => l.id.startsWith(p))) return false;
      return true;
    }),
  };
}

const rawStyleCache = new Map<string, StyleSpecification>();

async function fetchVectorStyle(url: string): Promise<StyleSpecification> {
  const cached = rawStyleCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  const json: StyleSpecification = await res.json();
  rawStyleCache.set(url, json);
  return json;
}

export async function resolveBaseMapStyle(
  baseMap: BaseMap,
  options: StyleOptions = {},
): Promise<StyleSpecification | string> {
  const needsTransform = baseMap.vector && (options.noLabels || options.noBorders || options.noRoads);
  if (!needsTransform) return baseMap.style;
  if (typeof baseMap.style !== "string") return applyStyleOptions(baseMap.style, options);
  const raw = await fetchVectorStyle(baseMap.style);
  return applyStyleOptions(raw, options);
}
