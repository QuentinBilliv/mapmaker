import { z } from "zod";
import type { MapData, LayerData, FeatureData, GroupData, PolygonFeature, PolylineFeature, PointFeature, TextFeature } from "./types";
import { BASE_MAPS } from "./map-style";
import { geometryTypeToFeatureType } from "./geojson";
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
    "mapmaker:type": z.enum(["polygon", "polyline", "point", "text"]),
    "mapmaker:layerId": z.string().max(100),
    "mapmaker:label": z.string().max(MAX_LABEL).default(""),
    "mapmaker:showLabel": z.boolean().default(false),
    "mapmaker:showInLegend": z.boolean().default(false),
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
    "mapmaker:lineDecoration": z
      .enum(["none", "crosses", "crosses-free", "ticks", "triangles-up", "triangles-down", "arrows-down", "arrows-up", "railway"])
      .default("none"),
    "mapmaker:decorationSpacing": z.number().min(5).max(200).default(50),
    "mapmaker:fillPattern": z
      .enum(["none", "stripes-diagonal", "stripes-horizontal", "stripes-vertical", "crosshatch", "dots"])
      .default("none"),
    "mapmaker:rotation": z.number().optional(),
    "mapmaker:shapeOrigin": z.enum(["rectangle", "circle"]).optional(),
    "mapmaker:textContent": z.string().max(MAX_LABEL).optional(),
    "mapmaker:fontSize": z.number().min(8).max(72).optional(),
    "mapmaker:fontFamily": z.enum(["sans", "serif", "mono"]).optional(),
    "mapmaker:textBorderEnabled": z.boolean().optional(),
    "mapmaker:textBorderColor": colorSchema.optional(),
    "mapmaker:textBorderWidth": z.number().min(0).max(5).optional(),
    "mapmaker:order": z.number().int().min(0).max(100_000).optional(),
    "mapmaker:groupId": z.string().max(100).optional(),
    "mapmaker:sourceText": z.string().max(MAX_STRING).default(""),
    "mapmaker:sourceUrl": z.string().url().max(MAX_STRING).refine(
      (v) => /^https?:\/\//i.test(v),
      "Only http and https URLs are allowed"
    ).optional(),
  })
  .passthrough();

const position = z.array(z.number()).min(2).max(3);

const geometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Point"), coordinates: position }),
  z.object({ type: z.literal("MultiPoint"), coordinates: z.array(position) }),
  z.object({ type: z.literal("LineString"), coordinates: z.array(position).min(2) }),
  z.object({ type: z.literal("MultiLineString"), coordinates: z.array(z.array(position).min(2)) }),
  z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(position).min(4)) }),
  z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(z.array(position).min(4))) }),
]);

const featureSchema = z.object({
  type: z.literal("Feature"),
  geometry: geometrySchema,
  properties: mapmakerProps,
});

const groupSchema = z.object({
  id: z.string().max(100),
  label: z.string().max(MAX_LABEL),
  order: z.number().int().min(0).max(100_000),
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
  groups: z.array(groupSchema).max(1000).default([]),
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
  baseMapId: string,
  groups: GroupData[] = []
): string {
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
      groups: groups.map(({ id, label, order }) => ({ id, label, order })),
    },
    features: features.map((f) => {
      const props: Record<string, unknown> = {
        "mapmaker:type": f.type,
        "mapmaker:layerId": f.layerId,
        "mapmaker:label": f.label,
        "mapmaker:showLabel": f.showLabel,
        "mapmaker:showInLegend": f.showInLegend,
        "mapmaker:color": f.color,
        "mapmaker:opacity": f.opacity,
        "mapmaker:order": f.order,
        "mapmaker:sourceText": f.sourceText,
      };
      if (f.rotation !== undefined) props["mapmaker:rotation"] = f.rotation;
      if (f.groupId) props["mapmaker:groupId"] = f.groupId;
      if (f.sourceUrl) props["mapmaker:sourceUrl"] = f.sourceUrl;
      switch (f.type) {
        case "polygon":
          props["mapmaker:smoothing"] = f.smoothing;
          props["mapmaker:strokeWidth"] = f.strokeWidth;
          props["mapmaker:lineStyle"] = f.lineStyle;
          props["mapmaker:lineDecoration"] = f.lineDecoration;
          props["mapmaker:decorationSpacing"] = f.decorationSpacing;
          props["mapmaker:fillPattern"] = f.fillPattern;
          if (f.shapeOrigin) props["mapmaker:shapeOrigin"] = f.shapeOrigin;
          break;
        case "polyline":
          props["mapmaker:smoothing"] = f.smoothing;
          props["mapmaker:strokeWidth"] = f.strokeWidth;
          props["mapmaker:lineStyle"] = f.lineStyle;
          props["mapmaker:arrowStyle"] = f.arrowStyle;
          props["mapmaker:lineDecoration"] = f.lineDecoration;
          props["mapmaker:decorationSpacing"] = f.decorationSpacing;
          break;
        case "point":
          props["mapmaker:size"] = f.size;
          if (f.shape) props["mapmaker:shape"] = f.shape;
          if (f.icon) props["mapmaker:icon"] = f.icon;
          if (f.customSvg) props["mapmaker:customSvg"] = f.customSvg;
          props["mapmaker:borderColor"] = f.borderColor;
          props["mapmaker:borderWidth"] = f.borderWidth;
          break;
        case "text":
          props["mapmaker:textContent"] = f.textContent;
          props["mapmaker:fontSize"] = f.fontSize;
          props["mapmaker:fontFamily"] = f.fontFamily;
          props["mapmaker:textBorderEnabled"] = f.textBorderEnabled;
          props["mapmaker:textBorderColor"] = f.textBorderColor;
          props["mapmaker:textBorderWidth"] = f.textBorderWidth;
          break;
      }
      return { type: "Feature" as const, geometry: f.geometry, properties: props };
    }),
  };

  return JSON.stringify(doc, null, 2);
}

type FeatureWithoutId =
  | Omit<PolygonFeature, "id">
  | Omit<PolylineFeature, "id">
  | Omit<PointFeature, "id">
  | Omit<TextFeature, "id">;

export interface DeserializedMap {
  map: Omit<MapData, "id">;
  baseMapId: string;
  layers: LayerData[];
  features: FeatureWithoutId[];
  groups: GroupData[];
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

  const features: FeatureWithoutId[] = result.features.flatMap((f, idx): FeatureWithoutId[] => {
    const p = f.properties;
    const declaredType = p["mapmaker:type"];
    const geoType = geometryTypeToFeatureType(f.geometry.type);
    const typeMatches = declaredType === "text" ? geoType === "point" : geoType === declaredType;
    if (!typeMatches) return [];
    if (!validLayerIds.has(p["mapmaker:layerId"])) return [];

    let customSvg = p["mapmaker:customSvg"];
    if (customSvg) {
      try {
        customSvg = sanitizeSvg(customSvg);
      } catch {
        return [];
      }
    }

    const base = {
      layerId: p["mapmaker:layerId"],
      label: p["mapmaker:label"],
      showLabel: p["mapmaker:showLabel"],
      showInLegend: p["mapmaker:showInLegend"] ?? false,
      color: p["mapmaker:color"],
      opacity: p["mapmaker:opacity"],
      order: p["mapmaker:order"] ?? idx,
      rotation: p["mapmaker:rotation"],
      groupId: p["mapmaker:groupId"],
      sourceText: p["mapmaker:sourceText"],
      sourceUrl: p["mapmaker:sourceUrl"],
      geometry: f.geometry,
    };
    switch (declaredType) {
      case "polygon":
        return [{ ...base, type: "polygon" as const, shapeOrigin: p["mapmaker:shapeOrigin"], smoothing: p["mapmaker:smoothing"], strokeWidth: p["mapmaker:strokeWidth"], lineStyle: p["mapmaker:lineStyle"], lineDecoration: p["mapmaker:lineDecoration"], decorationSpacing: p["mapmaker:decorationSpacing"], fillPattern: p["mapmaker:fillPattern"] }];
      case "polyline":
        return [{ ...base, type: "polyline" as const, smoothing: p["mapmaker:smoothing"], strokeWidth: p["mapmaker:strokeWidth"], lineStyle: p["mapmaker:lineStyle"], arrowStyle: p["mapmaker:arrowStyle"], lineDecoration: p["mapmaker:lineDecoration"], decorationSpacing: p["mapmaker:decorationSpacing"] }];
      case "point":
        return [{ ...base, type: "point" as const, size: p["mapmaker:size"] ?? 1, shape: p["mapmaker:shape"], icon: p["mapmaker:icon"], customSvg, borderColor: p["mapmaker:borderColor"] ?? "#ffffff", borderWidth: p["mapmaker:borderWidth"] ?? 0 }];
      case "text":
        return [{ ...base, type: "text" as const, textContent: p["mapmaker:textContent"] ?? "", fontSize: p["mapmaker:fontSize"] ?? 24, fontFamily: p["mapmaker:fontFamily"] ?? "sans", textBorderEnabled: p["mapmaker:textBorderEnabled"] ?? true, textBorderColor: p["mapmaker:textBorderColor"] ?? "#ffffff", textBorderWidth: p["mapmaker:textBorderWidth"] ?? 2 }];
    }
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
    groups: result.mapmaker.groups,
  };
}
