import { z } from "zod";
import type { MapData, FeatureData, GroupData, LegendEntry, PointLegendEntry, PolygonFeature, PolylineFeature, PointFeature, TextFeature, ChoroplethData, ChoroplethCategory } from "./types";
import { DEFAULT_CHOROPLETH } from "./types";
import { findBaseMap } from "./map-style";
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

const idomapsProps = z
  .object({
    "idomaps:type": z.enum(["polygon", "polyline", "point", "text"]),
    "idomaps:layerId": z.string().max(100),
    "idomaps:label": z.string().max(MAX_LABEL).default(""),
    "idomaps:description": z.string().max(MAX_STRING).default(""),
    "idomaps:imageUrl": z.string().url().max(500).refine(
      (v) => /^https?:\/\//i.test(v),
      "Only http and https URLs are allowed"
    ).optional(),
    "idomaps:showInLegend": z.boolean().default(false),
    "idomaps:color": colorSchema.default("#1a1a1a"),
    "idomaps:opacity": z.number().min(0).max(1).default(1),
    "idomaps:size": z.number().min(0.1).max(20).optional(),
    "idomaps:shape": z
      .enum(["circle", "triangle", "square", "diamond", "star", "cross", "pentagon", "hexagon"])
      .optional(),
    "idomaps:icon": z.string().max(200).optional(),
    "idomaps:customSvg": z.string().max(MAX_SVG).optional(),
    "idomaps:borderColor": colorSchema.optional(),
    "idomaps:borderWidth": z.number().min(0).max(50).optional(),
    "idomaps:smoothing": z.number().min(0).max(1).default(0),
    "idomaps:strokeWidth": z.number().min(0).max(50).default(3),
    "idomaps:lineStyle": z
      .enum(["solid", "dotted", "dash-short", "dash-medium", "dash-long"])
      .default("solid"),
    "idomaps:arrowStyle": z.enum(["none", "forward", "both"]).default("none"),
    "idomaps:lineDecoration": z
      .enum(["none", "crosses", "crosses-free", "ticks", "triangles-up", "triangles-down", "arrows-down", "arrows-up", "railway"])
      .default("none"),
    "idomaps:decorationSpacing": z.number().min(5).max(200).default(50),
    "idomaps:fillPattern": z
      .enum(["none", "stripes-diagonal", "stripes-horizontal", "stripes-vertical", "crosshatch", "dots"])
      .default("none"),
    "idomaps:rotation": z.number().optional(),
    "idomaps:shapeOrigin": z.enum(["rectangle", "circle"]).optional(),
    "idomaps:textContent": z.string().max(MAX_LABEL).optional(),
    "idomaps:fontSize": z.number().min(8).max(72).optional(),
    "idomaps:fontFamily": z.enum(["sans", "serif", "mono"]).optional(),
    "idomaps:bold": z.boolean().optional(),
    "idomaps:italic": z.boolean().optional(),
    "idomaps:textBorderEnabled": z.boolean().optional(),
    "idomaps:textBorderColor": colorSchema.optional(),
    "idomaps:textBorderWidth": z.number().min(0).max(5).optional(),
    "idomaps:order": z.number().int().min(0).max(100_000).optional(),
    "idomaps:groupId": z.string().max(100).optional(),
    "idomaps:legendEntryId": z.string().max(100).optional(),
    "idomaps:choroplethCategoryId": z.string().max(100).optional(),
    "idomaps:sourceText": z.string().max(MAX_STRING).default(""),
    "idomaps:sourceUrl": z.string().url().max(MAX_STRING).refine(
      (v) => /^https?:\/\//i.test(v),
      "Only http and https URLs are allowed"
    ).optional(),
  })
  .passthrough();

const position = z.array(z.number()).min(2).max(3);

export const geometrySchema = z.discriminatedUnion("type", [
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
  properties: idomapsProps,
});

const groupSchema = z.object({
  id: z.string().max(100),
  label: z.string().max(MAX_LABEL),
  order: z.number().int().min(0).max(100_000),
});

const legendEntrySchema = z.object({
  id: z.string().max(100),
  label: z.string().max(MAX_LABEL),
  order: z.number().int().min(0).max(100_000),
  featureType: z.enum(["point", "polyline", "polygon", "text"]),
  color: colorSchema,
  opacity: z.number().min(0).max(1),
  size: z.number().optional(),
  shape: z.enum(["circle", "triangle", "square", "diamond", "star", "cross", "pentagon", "hexagon"]).optional(),
  icon: z.string().max(200).optional(),
  customSvg: z.string().max(MAX_SVG).optional(),
  borderColor: colorSchema.optional(),
  borderWidth: z.number().min(0).max(50).optional(),
  smoothing: z.number().min(0).max(1).optional(),
  strokeWidth: z.number().min(0).max(50).optional(),
  lineStyle: z.enum(["solid", "dotted", "dash-short", "dash-medium", "dash-long"]).optional(),
  arrowStyle: z.enum(["none", "forward", "both"]).optional(),
  lineDecoration: z.enum(["none", "crosses", "crosses-free", "ticks", "triangles-up", "triangles-down", "arrows-down", "arrows-up", "railway"]).optional(),
  decorationSpacing: z.number().min(5).max(200).optional(),
  fillPattern: z.enum(["none", "stripes-diagonal", "stripes-horizontal", "stripes-vertical", "crosshatch", "dots"]).optional(),
  fontSize: z.number().min(8).max(72).optional(),
  fontFamily: z.enum(["sans", "serif", "mono"]).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  textBorderEnabled: z.boolean().optional(),
  textBorderColor: colorSchema.optional(),
  textBorderWidth: z.number().min(0).max(5).optional(),
});

const idomapsMeta = z.object({
  version: z.literal(1),
  map: z.object({
    title: z.string().max(500).default("New map"),
    description: z.string().max(MAX_STRING).default(""),
    tags: z.array(z.string().max(100)).max(50).default([]),
    center: z.tuple([z.number(), z.number()]).default([0, 20]),
    zoom: z.number().min(0).max(22).default(1),
    zoomLocked: z.boolean().optional(),
    panLocked: z.boolean().optional(),
  }),
  baseMap: z.string().max(100).default("osm"),
  styleOptions: z.object({
    noLabels: z.boolean().optional(),
    noBorders: z.boolean().optional(),
    noRoads: z.boolean().optional(),
  }).optional(),
  choropleth: z.object({
    enabled: z.boolean().default(false),
    tileLayer: z.enum(["countries", "us-states", "canada-provinces", "france-departements", "eu-nuts2", "china-provinces", "india-states", "russia-regions"]).default("countries"),
    mode: z.enum(["discrete", "gradient"]).default("discrete"),
    categories: z.array(z.object({
      id: z.string().max(100),
      color: z.string().max(30),
      label: z.string().max(200),
      order: z.number().int().min(0).max(1000),
    })).default([]),
    assignments: z.record(z.string(), z.string()).default({}),
    descriptions: z.record(z.string(), z.string().max(500)).default({}),
    imageUrls: z.record(z.string(), z.string().max(500)).default({}),
    gradientColors: z.tuple([z.string().max(30), z.string().max(30)]).default(["#22c55e", "#3b82f6"]),
    gradientLabel: z.string().max(200).default(""),
    values: z.record(z.string(), z.number()).default({}),
    opacity: z.number().min(0).max(1).default(0.7),
    entries: z.record(z.string(), z.object({ color: z.string().max(30), name: z.string().max(200) })).optional(),
    activeColor: z.string().max(30).optional(),
  }).default({ enabled: false, tileLayer: "countries", mode: "discrete", categories: [], assignments: {}, descriptions: {}, imageUrls: {}, gradientColors: ["#22c55e", "#3b82f6"], gradientLabel: "", values: {}, opacity: 0.7 }),
  layers: z.array(layerSchema).min(1).max(100),
  groups: z.array(groupSchema).max(1000).default([]),
  legendEntries: z.array(legendEntrySchema).max(1000).default([]),
});

const documentSchema = z.object({
  type: z.literal("FeatureCollection"),
  idomaps: idomapsMeta,
  features: z.array(featureSchema).max(10_000),
});

export function serialize(
  map: MapData,
  features: FeatureData[],
  baseMapId: string,
  groups: GroupData[] = [],
  legendEntries: LegendEntry[] = [],
  choropleth: ChoroplethData = DEFAULT_CHOROPLETH,
  styleOptions?: import("./map-style").StyleOptions,
): string {
  const doc = {
    type: "FeatureCollection" as const,
    idomaps: {
      version: 1 as const,
      map: {
        title: map.title,
        description: map.description,
        tags: map.tags,
        center: map.center,
        zoom: map.zoom,
        zoomLocked: map.zoomLocked || undefined,
        panLocked: map.panLocked || undefined,
      },
      baseMap: baseMapId,
      styleOptions: styleOptions ?? undefined,
      choropleth: {
        enabled: choropleth.enabled,
        tileLayer: choropleth.tileLayer,
        mode: choropleth.mode,
        categories: choropleth.categories.map(({ id, color, label, order }) => ({ id, color, label, order })),
        assignments: choropleth.assignments,
        descriptions: choropleth.descriptions,
        imageUrls: choropleth.imageUrls,
        gradientColors: choropleth.gradientColors,
        gradientLabel: choropleth.gradientLabel,
        values: choropleth.values,
        opacity: choropleth.opacity,
      },
      layers: [{ id: "default", name: "Main layer", visible: true, order: 0 }],
      groups: groups.map(({ id, label, order }) => ({ id, label, order })),
      legendEntries: legendEntries.map((e) => ({ ...e })),
    },
    features: features.map((f) => {
      const hasEntry = !!f.legendEntryId;
      const props: Record<string, unknown> = {
        "idomaps:type": f.type,
        "idomaps:layerId": "default",
        "idomaps:label": f.label,
        "idomaps:description": f.description,
        "idomaps:order": f.order,
      };
      if (f.imageUrl) props["idomaps:imageUrl"] = f.imageUrl;
      if (!hasEntry) {
        props["idomaps:color"] = f.color;
        props["idomaps:opacity"] = f.opacity;
      }
      if (f.rotation !== undefined) props["idomaps:rotation"] = f.rotation;
      if (f.groupId) props["idomaps:groupId"] = f.groupId;
      if (f.legendEntryId) props["idomaps:legendEntryId"] = f.legendEntryId;
      if (f.choroplethCategoryId) props["idomaps:choroplethCategoryId"] = f.choroplethCategoryId;
      if (f.type === "text") props["idomaps:textContent"] = f.textContent;
      if (!hasEntry) switch (f.type) {
        case "polygon":
          props["idomaps:smoothing"] = f.smoothing;
          props["idomaps:strokeWidth"] = f.strokeWidth;
          props["idomaps:lineStyle"] = f.lineStyle;
          props["idomaps:lineDecoration"] = f.lineDecoration;
          props["idomaps:decorationSpacing"] = f.decorationSpacing;
          props["idomaps:fillPattern"] = f.fillPattern;
          if (f.shapeOrigin) props["idomaps:shapeOrigin"] = f.shapeOrigin;
          break;
        case "polyline":
          props["idomaps:smoothing"] = f.smoothing;
          props["idomaps:strokeWidth"] = f.strokeWidth;
          props["idomaps:lineStyle"] = f.lineStyle;
          props["idomaps:arrowStyle"] = f.arrowStyle;
          props["idomaps:lineDecoration"] = f.lineDecoration;
          props["idomaps:decorationSpacing"] = f.decorationSpacing;
          break;
        case "point":
          props["idomaps:size"] = f.size;
          if (f.shape) props["idomaps:shape"] = f.shape;
          if (f.customSvg) props["idomaps:customSvg"] = f.customSvg;
          props["idomaps:borderColor"] = f.borderColor;
          props["idomaps:borderWidth"] = f.borderWidth;
          break;
        case "text":
          props["idomaps:fontSize"] = f.fontSize;
          props["idomaps:fontFamily"] = f.fontFamily;
          if (f.bold) props["idomaps:bold"] = f.bold;
          if (f.italic) props["idomaps:italic"] = f.italic;
          props["idomaps:textBorderEnabled"] = f.textBorderEnabled;
          props["idomaps:textBorderColor"] = f.textBorderColor;
          props["idomaps:textBorderWidth"] = f.textBorderWidth;
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
  styleOptions?: import("./map-style").StyleOptions;
  choropleth: ChoroplethData;
  features: FeatureWithoutId[];
  groups: GroupData[];
  legendEntries: LegendEntry[];
  pendingIconMigrations: { featureIndex: number; iconId: string }[];
  droppedFeatureCount: number;
}

export function deserialize(raw: string): DeserializedMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }

  const result = documentSchema.parse(parsed);

  const knownBaseMap = findBaseMap(result.idomaps.baseMap);

  const pendingIconMigrations: { featureIndex: number; iconId: string }[] = [];
  let droppedFeatureCount = 0;

  const features: FeatureWithoutId[] = result.features.flatMap((f, idx): FeatureWithoutId[] => {
    const p = f.properties;
    const declaredType = p["idomaps:type"];
    const geoType = geometryTypeToFeatureType(f.geometry.type);
    const typeMatches = declaredType === "text" ? geoType === "point" : geoType === declaredType;
    if (!typeMatches) {
      droppedFeatureCount++;
      return [];
    }

    let customSvg = p["idomaps:customSvg"];
    if (customSvg) {
      try {
        customSvg = sanitizeSvg(customSvg);
      } catch {
        droppedFeatureCount++;
        return [];
      }
    }

    const base = {
      label: p["idomaps:label"],
      description: p["idomaps:description"] ?? "",
      imageUrl: p["idomaps:imageUrl"],
      color: p["idomaps:color"],
      opacity: p["idomaps:opacity"],
      order: p["idomaps:order"] ?? idx,
      rotation: p["idomaps:rotation"],
      groupId: p["idomaps:groupId"],
      legendEntryId: p["idomaps:legendEntryId"],
      choroplethCategoryId: p["idomaps:choroplethCategoryId"],
      geometry: f.geometry,
    };
    switch (declaredType) {
      case "polygon":
        return [{ ...base, type: "polygon" as const, shapeOrigin: p["idomaps:shapeOrigin"], smoothing: p["idomaps:smoothing"], strokeWidth: p["idomaps:strokeWidth"], lineStyle: p["idomaps:lineStyle"], lineDecoration: p["idomaps:lineDecoration"], decorationSpacing: p["idomaps:decorationSpacing"], fillPattern: p["idomaps:fillPattern"] }];
      case "polyline":
        return [{ ...base, type: "polyline" as const, smoothing: p["idomaps:smoothing"], strokeWidth: p["idomaps:strokeWidth"], lineStyle: p["idomaps:lineStyle"], arrowStyle: p["idomaps:arrowStyle"], lineDecoration: p["idomaps:lineDecoration"], decorationSpacing: p["idomaps:decorationSpacing"] }];
      case "point": {
        const legacyIcon: string | undefined = !customSvg ? p["idomaps:icon"] : undefined;
        if (legacyIcon) pendingIconMigrations.push({ featureIndex: idx, iconId: legacyIcon });
        return [{ ...base, type: "point" as const, size: p["idomaps:size"] ?? 1, shape: p["idomaps:shape"], customSvg, borderColor: p["idomaps:borderColor"] ?? "#ffffff", borderWidth: p["idomaps:borderWidth"] ?? 0 }];
      }
      case "text":
        return [{ ...base, type: "text" as const, textContent: p["idomaps:textContent"]?.trim() || base.label?.trim() || "Text", fontSize: p["idomaps:fontSize"] ?? 24, fontFamily: p["idomaps:fontFamily"] ?? "sans", bold: p["idomaps:bold"] ?? false, italic: p["idomaps:italic"] ?? false, textBorderEnabled: p["idomaps:textBorderEnabled"] ?? true, textBorderColor: p["idomaps:textBorderColor"] ?? "#ffffff", textBorderWidth: p["idomaps:textBorderWidth"] ?? 2 }];
    }
  });

  const rawChoropleth = result.idomaps.choropleth;
  let choropleth: ChoroplethData;
  const tileLayer = (rawChoropleth.tileLayer ?? "countries") as ChoroplethData["tileLayer"];
  const rawDescriptions = (rawChoropleth.descriptions as Record<string, string> | undefined) ?? {};
  const rawImageUrls = (rawChoropleth.imageUrls as Record<string, string> | undefined) ?? {};
  if (rawChoropleth.categories && rawChoropleth.categories.length > 0) {
    choropleth = {
      enabled: rawChoropleth.enabled,
      tileLayer,
      mode: rawChoropleth.mode ?? "discrete",
      categories: rawChoropleth.categories as ChoroplethCategory[],
      assignments: rawChoropleth.assignments ?? {},
      descriptions: rawDescriptions,
      imageUrls: rawImageUrls,
      gradientColors: (rawChoropleth.gradientColors as [string, string]) ?? ["#22c55e", "#3b82f6"],
      gradientLabel: (rawChoropleth.gradientLabel as string) ?? "",
      values: (rawChoropleth.values as Record<string, number>) ?? {},
      opacity: rawChoropleth.opacity,
      activeCategoryId: null,
    };
  } else if (rawChoropleth.mode === "gradient" && rawChoropleth.values && Object.keys(rawChoropleth.values).length > 0) {
    choropleth = {
      enabled: rawChoropleth.enabled,
      tileLayer,
      mode: "gradient",
      categories: [],
      assignments: {},
      descriptions: {},
      imageUrls: {},
      gradientColors: (rawChoropleth.gradientColors as [string, string]) ?? ["#22c55e", "#3b82f6"],
      gradientLabel: (rawChoropleth.gradientLabel as string) ?? "",
      values: (rawChoropleth.values as Record<string, number>) ?? {},
      opacity: rawChoropleth.opacity,
      activeCategoryId: null,
    };
  } else if (rawChoropleth.entries && Object.keys(rawChoropleth.entries).length > 0) {
    choropleth = migrateLegacyChoropleth(rawChoropleth);
  } else {
    choropleth = {
      enabled: rawChoropleth.enabled,
      tileLayer,
      mode: rawChoropleth.mode ?? "discrete",
      categories: [],
      assignments: {},
      descriptions: rawDescriptions,
      imageUrls: rawImageUrls,
      gradientColors: (rawChoropleth.gradientColors as [string, string]) ?? ["#22c55e", "#3b82f6"],
      gradientLabel: (rawChoropleth.gradientLabel as string) ?? "",
      values: (rawChoropleth.values as Record<string, number>) ?? {},
      opacity: rawChoropleth.opacity,
      activeCategoryId: null,
    };
  }

  return {
    map: {
      title: result.idomaps.map.title,
      description: result.idomaps.map.description,
      tags: result.idomaps.map.tags,
      center: result.idomaps.map.center,
      zoom: result.idomaps.map.zoom,
      zoomLocked: result.idomaps.map.zoomLocked,
      panLocked: result.idomaps.map.panLocked,
    },
    baseMapId: knownBaseMap.id,
    styleOptions: result.idomaps.styleOptions ?? undefined,
    choropleth,
    features,
    groups: result.idomaps.groups,
    legendEntries: (result.idomaps.legendEntries ?? []) as LegendEntry[],
    pendingIconMigrations,
    droppedFeatureCount,
  };
}

function migrateLegacyChoropleth(raw: { enabled: boolean; entries?: Record<string, { color: string; name: string }>; opacity: number }): ChoroplethData {
  const entries = raw.entries ?? {};
  const byColor = new Map<string, string[]>();
  for (const [iso, entry] of Object.entries(entries)) {
    if (!byColor.has(entry.color)) byColor.set(entry.color, []);
    byColor.get(entry.color)!.push(iso);
  }
  const categories: ChoroplethCategory[] = [];
  const assignments: Record<string, string> = {};
  let order = 0;
  byColor.forEach((isos, color) => {
    const id = `migrated-${order}`;
    categories.push({ id, color, label: `Category ${order + 1}`, order });
    for (const iso of isos) assignments[iso] = id;
    order++;
  });
  return {
    enabled: raw.enabled,
    tileLayer: "countries",
    mode: "discrete",
    categories,
    assignments,
    descriptions: {},
    imageUrls: {},
    gradientColors: ["#22c55e", "#3b82f6"] as [string, string],
    gradientLabel: "",
    values: {},
    opacity: raw.opacity,
    activeCategoryId: null,
  };
}

export async function migrateIconsToSvg(data: DeserializedMap): Promise<void> {
  type LegacyPointEntry = PointLegendEntry & { icon?: string };
  const legendMigrations: { entry: LegacyPointEntry; iconId: string }[] = [];
  for (const e of data.legendEntries) {
    if (e.featureType !== "point") continue;
    const le = e as LegacyPointEntry;
    if (le.icon && !le.customSvg) legendMigrations.push({ entry: le, iconId: le.icon });
  }

  if (data.pendingIconMigrations.length === 0 && legendMigrations.length === 0) return;
  const { resolveIconToSvg } = await import("./icon-catalog");
  await Promise.all([
    ...data.pendingIconMigrations.map(async ({ featureIndex, iconId }) => {
      const feature = data.features[featureIndex];
      if (!feature || feature.type !== "point") return;
      const svg = await resolveIconToSvg(iconId);
      if (svg) feature.customSvg = svg;
    }),
    ...legendMigrations.map(async ({ entry, iconId }) => {
      const svg = await resolveIconToSvg(iconId);
      if (svg) entry.customSvg = svg;
      delete entry.icon;
    }),
  ]);
}
