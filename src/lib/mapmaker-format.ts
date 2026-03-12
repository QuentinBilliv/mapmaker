import { z } from "zod";
import type { MapData, LayerData, FeatureData } from "./types";
import { BASE_MAPS } from "./map-style";
import { parseGeometry, geometryTypeToFeatureType } from "./geojson";
import { sanitizeSvg } from "./svg-sanitizer";

const MAX_STRING = 10_000;
const MAX_SVG = 50_000;
const MAX_LABEL = 500;

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

const colorSchema = z.string().max(30).regex(HEX_COLOR, "Invalid color");

const layerSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  visible: z.boolean(),
  order: z.number().int().min(0).max(1000),
});

const mapmakerProps = z
  .object({
    "mapmaker:type": z.enum(["polygon", "polyline", "point"]),
    "mapmaker:layerId": z.string().max(100),
    "mapmaker:label": z.string().max(MAX_LABEL).default(""),
    "mapmaker:color": colorSchema,
    "mapmaker:opacity": z.number().min(0).max(1),
    "mapmaker:size": z.number().min(0.1).max(20).optional(),
    "mapmaker:shape": z
      .enum(["circle", "triangle", "square", "diamond", "star", "cross", "pentagon", "hexagon"])
      .optional(),
    "mapmaker:icon": z.string().max(200).optional(),
    "mapmaker:customSvg": z.string().max(MAX_SVG).optional(),
    "mapmaker:borderColor": colorSchema.optional(),
    "mapmaker:borderWidth": z.number().min(0).max(50).optional(),
    "mapmaker:smoothing": z.number().min(0).max(1).default(0),
    "mapmaker:strokeWidth": z.number().min(0).max(50).default(3),
    "mapmaker:lineStyle": z
      .enum(["solid", "dotted", "dash-short", "dash-medium", "dash-long"])
      .default("solid"),
    "mapmaker:arrowStyle": z.enum(["none", "forward", "both"]).default("none"),
    "mapmaker:fillPattern": z
      .enum(["none", "stripes-diagonal", "stripes-horizontal", "stripes-vertical", "crosshatch", "dots"])
      .default("none"),
    "mapmaker:shapeOrigin": z.enum(["rectangle", "circle"]).optional(),
    "mapmaker:sourceText": z.string().max(MAX_STRING).default(""),
    "mapmaker:sourceUrl": z.string().url().max(MAX_STRING).optional(),
  })
  .passthrough();

const geometrySchema = z.object({
  type: z.enum([
    "Point", "MultiPoint",
    "LineString", "MultiLineString",
    "Polygon", "MultiPolygon",
  ]),
  coordinates: z.any(),
});

const featureSchema = z.object({
  type: z.literal("Feature"),
  geometry: geometrySchema,
  properties: mapmakerProps,
});

const mapmakerMeta = z.object({
  version: z.literal(1),
  map: z.object({
    title: z.string().max(500).default("New map"),
    description: z.string().max(MAX_STRING).default(""),
    tags: z.array(z.string().max(100)).max(50).default([]),
    license: z.string().max(100).default("CC BY"),
    center: z.tuple([z.number(), z.number()]).default([2.3, 46.5]),
    zoom: z.number().min(0).max(22).default(5),
  }),
  baseMap: z.string().max(100).default("osm"),
  layers: z.array(layerSchema).min(1).max(100),
});

const documentSchema = z.object({
  type: z.literal("FeatureCollection"),
  mapmaker: mapmakerMeta,
  features: z.array(featureSchema).max(10_000),
});

export function serialize(
  map: MapData,
  layers: LayerData[],
  features: FeatureData[],
  baseMapId: string
): string {
  const layerMap = new Map(layers.map((l) => [l.id, l]));

  const doc = {
    type: "FeatureCollection" as const,
    mapmaker: {
      version: 1 as const,
      map: {
        title: map.title,
        description: map.description,
        tags: map.tags,
        license: map.license,
        center: map.center,
        zoom: map.zoom,
      },
      baseMap: baseMapId,
      layers: layers.map(({ id, name, visible, order }) => ({ id, name, visible, order })),
    },
    features: features.flatMap((f) => {
      const geometry = parseGeometry(f.geometry);
      if (!geometry) return [];
      const props: Record<string, unknown> = {
        "mapmaker:type": f.type,
        "mapmaker:layerId": f.layerId,
        "mapmaker:label": f.label,
        "mapmaker:color": f.color,
        "mapmaker:opacity": f.opacity,
        "mapmaker:smoothing": f.smoothing,
        "mapmaker:strokeWidth": f.strokeWidth,
        "mapmaker:lineStyle": f.lineStyle,
        "mapmaker:arrowStyle": f.arrowStyle,
        "mapmaker:fillPattern": f.fillPattern,
        "mapmaker:sourceText": f.sourceText,
      };
      if (f.size !== undefined) props["mapmaker:size"] = f.size;
      if (f.shape) props["mapmaker:shape"] = f.shape;
      if (f.icon) props["mapmaker:icon"] = f.icon;
      if (f.customSvg) props["mapmaker:customSvg"] = f.customSvg;
      if (f.borderColor) props["mapmaker:borderColor"] = f.borderColor;
      if (f.borderWidth !== undefined) props["mapmaker:borderWidth"] = f.borderWidth;
      if (f.shapeOrigin) props["mapmaker:shapeOrigin"] = f.shapeOrigin;
      if (f.sourceUrl) props["mapmaker:sourceUrl"] = f.sourceUrl;
      return [{ type: "Feature" as const, geometry, properties: props }];
    }),
  };

  return JSON.stringify(doc, null, 2);
}

export interface DeserializedMap {
  map: Omit<MapData, "id">;
  baseMapId: string;
  layers: LayerData[];
  features: Omit<FeatureData, "id">[];
}

export function deserialize(raw: string): DeserializedMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }

  const result = documentSchema.parse(parsed);

  const validLayerIds = new Set(result.mapmaker.layers.map((l) => l.id));
  const knownBaseMap = BASE_MAPS.find((b) => b.id === result.mapmaker.baseMap);

  const features: Omit<FeatureData, "id">[] = result.features.flatMap((f) => {
    const p = f.properties;
    const geoType = geometryTypeToFeatureType(f.geometry.type);
    if (geoType !== p["mapmaker:type"]) return [];
    if (!validLayerIds.has(p["mapmaker:layerId"])) return [];

    let customSvg = p["mapmaker:customSvg"];
    if (customSvg) {
      try {
        customSvg = sanitizeSvg(customSvg);
      } catch {
        return [];
      }
    }

    return [{
      layerId: p["mapmaker:layerId"],
      type: p["mapmaker:type"],
      shapeOrigin: p["mapmaker:shapeOrigin"],
      label: p["mapmaker:label"],
      color: p["mapmaker:color"],
      opacity: p["mapmaker:opacity"],
      size: p["mapmaker:size"],
      shape: p["mapmaker:shape"],
      icon: p["mapmaker:icon"],
      customSvg,
      borderColor: p["mapmaker:borderColor"],
      borderWidth: p["mapmaker:borderWidth"],
      smoothing: p["mapmaker:smoothing"],
      strokeWidth: p["mapmaker:strokeWidth"],
      lineStyle: p["mapmaker:lineStyle"],
      arrowStyle: p["mapmaker:arrowStyle"],
      fillPattern: p["mapmaker:fillPattern"],
      sourceText: p["mapmaker:sourceText"],
      sourceUrl: p["mapmaker:sourceUrl"],
      geometry: JSON.stringify(f.geometry),
    }];
  });

  return {
    map: {
      title: result.mapmaker.map.title,
      description: result.mapmaker.map.description,
      tags: result.mapmaker.map.tags,
      license: result.mapmaker.map.license,
      center: result.mapmaker.map.center,
      zoom: result.mapmaker.map.zoom,
    },
    baseMapId: knownBaseMap?.id ?? "osm",
    layers: result.mapmaker.layers,
    features,
  };
}
