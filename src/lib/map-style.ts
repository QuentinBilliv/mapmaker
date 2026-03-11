import type {
  StyleSpecification,
  LayerSpecification,
  SourceSpecification,
} from "@maplibre/maplibre-gl-style-spec";
import { COLORS } from "./defaults";

export interface BaseMap {
  id: string;
  label: string;
  style: StyleSpecification;
}

const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

export const FEATURES_SOURCE = "map-features";
export const ARROW_SOURCE = "arrow-heads";

const EMPTY_FC = { type: "FeatureCollection" as const, features: [] };

const DASH_STYLES: { id: string; dash?: number[] }[] = [
  { id: "solid" },
  { id: "dotted", dash: [1, 2] },
  { id: "dash-short", dash: [2, 2] },
  { id: "dash-medium", dash: [4, 3] },
  { id: "dash-long", dash: [8, 4] },
];

function featureLayers(): LayerSpecification[] {
  const layers: LayerSpecification[] = [];

  layers.push({
    id: "features-fill",
    type: "fill",
    source: FEATURES_SOURCE,
    paint: {
      "fill-pattern": ["get", "patternId"] as unknown as string,
      "fill-opacity": 1,
    },
    filter: ["==", "$type", "Polygon"],
  } as LayerSpecification);

  for (const style of DASH_STYLES) {
    layers.push({
      id: `features-outline-${style.id}`,
      type: "line",
      source: FEATURES_SOURCE,
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["get", "strokeWidth"],
        ...(style.dash ? { "line-dasharray": style.dash } : {}),
      },
      filter: ["all", ["==", "$type", "Polygon"], ["==", "lineStyle", style.id]],
    } as LayerSpecification);

    layers.push({
      id: `features-line-${style.id}`,
      type: "line",
      source: FEATURES_SOURCE,
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["get", "strokeWidth"],
        "line-opacity": ["get", "opacity"],
        ...(style.dash ? { "line-dasharray": style.dash } : {}),
      },
      filter: ["all", ["==", "$type", "LineString"], ["==", "lineStyle", style.id]],
    } as LayerSpecification);
  }

  layers.push({
    id: "features-circle",
    type: "symbol",
    source: FEATURES_SOURCE,
    layout: {
      "icon-image": ["get", "iconId"],
      "icon-size": ["*", ["get", "size"], 0.25],
      "icon-allow-overlap": true,
      "icon-anchor": "center",
    },
    paint: {
      "icon-opacity": ["get", "opacity"],
    },
    filter: ["==", "$type", "Point"],
  } as LayerSpecification);

  layers.push({
    id: "features-arrows",
    type: "symbol",
    source: ARROW_SOURCE,
    layout: {
      "icon-image": "arrowhead",
      "icon-size": ["*", ["get", "strokeWidth"], 0.15],
      "icon-rotate": ["get", "bearing"],
      "icon-allow-overlap": true,
      "icon-rotation-alignment": "map",
    },
    paint: {
      "icon-color": ["get", "color"],
      "icon-opacity": ["get", "opacity"],
    },
  } as LayerSpecification);

  layers.push({
    id: "features-labels",
    type: "symbol",
    source: FEATURES_SOURCE,
    layout: {
      "text-field": ["get", "label"],
      "text-size": 12,
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": COLORS.primary,
      "text-halo-color": COLORS.white,
      "text-halo-width": 1,
    },
  } as LayerSpecification);

  return layers;
}

function rasterStyle(
  name: string,
  tiles: string[],
  attribution: string,
  maxzoom = 19
): StyleSpecification {
  const customSources: Record<string, SourceSpecification> = {
    [FEATURES_SOURCE]: { type: "geojson", data: EMPTY_FC } as SourceSpecification,
    [ARROW_SOURCE]: { type: "geojson", data: EMPTY_FC } as SourceSpecification,
  };

  return {
    version: 8,
    name,
    glyphs: GLYPHS,
    sources: {
      basemap: { type: "raster", tiles, tileSize: 256, attribution, maxzoom },
      ...customSources,
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": COLORS.mapBackground } },
      { id: "basemap", type: "raster", source: "basemap" },
      ...featureLayers(),
    ],
  };
}

export const BASE_MAPS: BaseMap[] = [
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
  {
    id: "natgeo",
    label: "National Geographic",
    style: rasterStyle(
      "ESRI NatGeo",
      ["https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"],
      '&copy; <a href="https://www.esri.com/">Esri</a> &copy; National Geographic',
      16
    ),
  },
];

export const DEFAULT_BASE_MAP = BASE_MAPS[0];
