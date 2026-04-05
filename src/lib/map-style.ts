import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { COLORS } from "./defaults";

export interface BaseMap {
  id: string;
  label: string;
  style: StyleSpecification | string;
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
  },
  {
    id: "bright",
    label: "Bright",
    style: "https://tiles.openfreemap.org/styles/bright",
  },
  {
    id: "positron",
    label: "Positron",
    style: "https://tiles.openfreemap.org/styles/positron",
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
  natgeo: "liberty",
};

export function findBaseMap(id: string): BaseMap {
  const resolved = LEGACY_BASE_MAP_IDS[id] ?? id;
  return BASE_MAPS.find((b) => b.id === resolved) ?? BASE_MAPS[0];
}
