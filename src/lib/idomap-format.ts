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

const idomapProps = z
  .object({
    "idomap:type": z.enum(["polygon", "polyline", "point", "text"]),
    "idomap:layerId": z.string().max(100),
    "idomap:label": z.string().max(MAX_LABEL).default(""),
    "idomap:description": z.string().max(MAX_STRING).default(""),
    "idomap:showInLegend": z.boolean().default(false),
    "idomap:color": colorSchema.default("#1a1a1a"),
    "idomap:opacity": z.number().min(0).max(1).default(1),
    "idomap:size": z.number().min(0.1).max(20).optional(),
    "idomap:shape": z
      .enum(["circle", "triangle", "square", "diamond", "star", "cross", "pentagon", "hexagon"])
      .optional(),
    "idomap:icon": z.string().max(200).optional(),
    "idomap:customSvg": z.string().max(MAX_SVG).optional(),
    "idomap:borderColor": colorSchema.optional(),
    "idomap:borderWidth": z.number().min(0).max(50).optional(),
    "idomap:smoothing": z.number().min(0).max(1).default(0),
    "idomap:strokeWidth": z.number().min(0).max(50).default(3),
    "idomap:lineStyle": z
      .enum(["solid", "dotted", "dash-short", "dash-medium", "dash-long"])
      .default("solid"),
    "idomap:arrowStyle": z.enum(["none", "forward", "both"]).default("none"),
    "idomap:lineDecoration": z
      .enum(["none", "crosses", "crosses-free", "ticks", "triangles-up", "triangles-down", "arrows-down", "arrows-up", "railway"])
      .default("none"),
    "idomap:decorationSpacing": z.number().min(5).max(200).default(50),
    "idomap:fillPattern": z
      .enum(["none", "stripes-diagonal", "stripes-horizontal", "stripes-vertical", "crosshatch", "dots"])
      .default("none"),
    "idomap:rotation": z.number().optional(),
    "idomap:shapeOrigin": z.enum(["rectangle", "circle"]).optional(),
    "idomap:textContent": z.string().max(MAX_LABEL).optional(),
    "idomap:fontSize": z.number().min(8).max(72).optional(),
    "idomap:fontFamily": z.enum(["sans", "serif", "mono"]).optional(),
    "idomap:bold": z.boolean().optional(),
    "idomap:italic": z.boolean().optional(),
    "idomap:textBorderEnabled": z.boolean().optional(),
    "idomap:textBorderColor": colorSchema.optional(),
    "idomap:textBorderWidth": z.number().min(0).max(5).optional(),
    "idomap:order": z.number().int().min(0).max(100_000).optional(),
    "idomap:groupId": z.string().max(100).optional(),
    "idomap:legendEntryId": z.string().max(100).optional(),
    "idomap:choroplethCategoryId": z.string().max(100).optional(),
    "idomap:sourceText": z.string().max(MAX_STRING).default(""),
    "idomap:sourceUrl": z.string().url().max(MAX_STRING).refine(
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
  properties: idomapProps,
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

const idomapMeta = z.object({
  version: z.literal(1),
  map: z.object({
    title: z.string().max(500).default("New map"),
    description: z.string().max(MAX_STRING).default(""),
    tags: z.array(z.string().max(100)).max(50).default([]),
    license: z.string().max(100).default("CC BY"),
    center: z.tuple([z.number(), z.number()]).default([0, 20]),
    zoom: z.number().min(0).max(22).default(1),
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
    gradientColors: z.tuple([z.string().max(30), z.string().max(30)]).default(["#22c55e", "#3b82f6"]),
    gradientLabel: z.string().max(200).default(""),
    values: z.record(z.string(), z.number()).default({}),
    opacity: z.number().min(0).max(1).default(0.7),
    entries: z.record(z.string(), z.object({ color: z.string().max(30), name: z.string().max(200) })).optional(),
    activeColor: z.string().max(30).optional(),
  }).default({ enabled: false, tileLayer: "countries", mode: "discrete", categories: [], assignments: {}, gradientColors: ["#22c55e", "#3b82f6"], gradientLabel: "", values: {}, opacity: 0.7 }),
  layers: z.array(layerSchema).min(1).max(100),
  groups: z.array(groupSchema).max(1000).default([]),
  legendEntries: z.array(legendEntrySchema).max(1000).default([]),
});

const documentSchema = z.object({
  type: z.literal("FeatureCollection"),
  idomap: idomapMeta,
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
    idomap: {
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
      styleOptions: styleOptions ?? undefined,
      choropleth: {
        enabled: choropleth.enabled,
        tileLayer: choropleth.tileLayer,
        mode: choropleth.mode,
        categories: choropleth.categories.map(({ id, color, label, order }) => ({ id, color, label, order })),
        assignments: choropleth.assignments,
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
        "idomap:type": f.type,
        "idomap:layerId": "default",
        "idomap:label": f.label,
        "idomap:description": f.description,
        "idomap:order": f.order,
      };
      if (!hasEntry) {
        props["idomap:color"] = f.color;
        props["idomap:opacity"] = f.opacity;
      }
      if (f.rotation !== undefined) props["idomap:rotation"] = f.rotation;
      if (f.groupId) props["idomap:groupId"] = f.groupId;
      if (f.legendEntryId) props["idomap:legendEntryId"] = f.legendEntryId;
      if (f.choroplethCategoryId) props["idomap:choroplethCategoryId"] = f.choroplethCategoryId;
      if (f.type === "text") props["idomap:textContent"] = f.textContent;
      if (!hasEntry) switch (f.type) {
        case "polygon":
          props["idomap:smoothing"] = f.smoothing;
          props["idomap:strokeWidth"] = f.strokeWidth;
          props["idomap:lineStyle"] = f.lineStyle;
          props["idomap:lineDecoration"] = f.lineDecoration;
          props["idomap:decorationSpacing"] = f.decorationSpacing;
          props["idomap:fillPattern"] = f.fillPattern;
          if (f.shapeOrigin) props["idomap:shapeOrigin"] = f.shapeOrigin;
          break;
        case "polyline":
          props["idomap:smoothing"] = f.smoothing;
          props["idomap:strokeWidth"] = f.strokeWidth;
          props["idomap:lineStyle"] = f.lineStyle;
          props["idomap:arrowStyle"] = f.arrowStyle;
          props["idomap:lineDecoration"] = f.lineDecoration;
          props["idomap:decorationSpacing"] = f.decorationSpacing;
          break;
        case "point":
          props["idomap:size"] = f.size;
          if (f.shape) props["idomap:shape"] = f.shape;
          if (f.customSvg) props["idomap:customSvg"] = f.customSvg;
          props["idomap:borderColor"] = f.borderColor;
          props["idomap:borderWidth"] = f.borderWidth;
          break;
        case "text":
          props["idomap:fontSize"] = f.fontSize;
          props["idomap:fontFamily"] = f.fontFamily;
          if (f.bold) props["idomap:bold"] = f.bold;
          if (f.italic) props["idomap:italic"] = f.italic;
          props["idomap:textBorderEnabled"] = f.textBorderEnabled;
          props["idomap:textBorderColor"] = f.textBorderColor;
          props["idomap:textBorderWidth"] = f.textBorderWidth;
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
}

export function deserialize(raw: string): DeserializedMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }

  const result = documentSchema.parse(parsed);

  const knownBaseMap = findBaseMap(result.idomap.baseMap);

  const pendingIconMigrations: { featureIndex: number; iconId: string }[] = [];

  const features: FeatureWithoutId[] = result.features.flatMap((f, idx): FeatureWithoutId[] => {
    const p = f.properties;
    const declaredType = p["idomap:type"];
    const geoType = geometryTypeToFeatureType(f.geometry.type);
    const typeMatches = declaredType === "text" ? geoType === "point" : geoType === declaredType;
    if (!typeMatches) return [];

    let customSvg = p["idomap:customSvg"];
    if (customSvg) {
      try {
        customSvg = sanitizeSvg(customSvg);
      } catch {
        return [];
      }
    }

    const base = {
      label: p["idomap:label"],
      description: p["idomap:description"] ?? "",
      color: p["idomap:color"],
      opacity: p["idomap:opacity"],
      order: p["idomap:order"] ?? idx,
      rotation: p["idomap:rotation"],
      groupId: p["idomap:groupId"],
      legendEntryId: p["idomap:legendEntryId"],
      choroplethCategoryId: p["idomap:choroplethCategoryId"],
      geometry: f.geometry,
    };
    switch (declaredType) {
      case "polygon":
        return [{ ...base, type: "polygon" as const, shapeOrigin: p["idomap:shapeOrigin"], smoothing: p["idomap:smoothing"], strokeWidth: p["idomap:strokeWidth"], lineStyle: p["idomap:lineStyle"], lineDecoration: p["idomap:lineDecoration"], decorationSpacing: p["idomap:decorationSpacing"], fillPattern: p["idomap:fillPattern"] }];
      case "polyline":
        return [{ ...base, type: "polyline" as const, smoothing: p["idomap:smoothing"], strokeWidth: p["idomap:strokeWidth"], lineStyle: p["idomap:lineStyle"], arrowStyle: p["idomap:arrowStyle"], lineDecoration: p["idomap:lineDecoration"], decorationSpacing: p["idomap:decorationSpacing"] }];
      case "point": {
        const legacyIcon: string | undefined = !customSvg ? p["idomap:icon"] : undefined;
        if (legacyIcon) pendingIconMigrations.push({ featureIndex: idx, iconId: legacyIcon });
        return [{ ...base, type: "point" as const, size: p["idomap:size"] ?? 1, shape: p["idomap:shape"], customSvg, borderColor: p["idomap:borderColor"] ?? "#ffffff", borderWidth: p["idomap:borderWidth"] ?? 0 }];
      }
      case "text":
        return [{ ...base, type: "text" as const, textContent: p["idomap:textContent"] ?? "", fontSize: p["idomap:fontSize"] ?? 24, fontFamily: p["idomap:fontFamily"] ?? "sans", bold: p["idomap:bold"] ?? false, italic: p["idomap:italic"] ?? false, textBorderEnabled: p["idomap:textBorderEnabled"] ?? true, textBorderColor: p["idomap:textBorderColor"] ?? "#ffffff", textBorderWidth: p["idomap:textBorderWidth"] ?? 2 }];
    }
  });

  const rawChoropleth = result.idomap.choropleth;
  let choropleth: ChoroplethData;
  const tileLayer = (rawChoropleth.tileLayer ?? "countries") as ChoroplethData["tileLayer"];
  if (rawChoropleth.categories && rawChoropleth.categories.length > 0) {
    choropleth = {
      enabled: rawChoropleth.enabled,
      tileLayer,
      mode: rawChoropleth.mode ?? "discrete",
      categories: rawChoropleth.categories as ChoroplethCategory[],
      assignments: rawChoropleth.assignments ?? {},
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
      gradientColors: (rawChoropleth.gradientColors as [string, string]) ?? ["#22c55e", "#3b82f6"],
      gradientLabel: (rawChoropleth.gradientLabel as string) ?? "",
      values: (rawChoropleth.values as Record<string, number>) ?? {},
      opacity: rawChoropleth.opacity,
      activeCategoryId: null,
    };
  }

  return {
    map: {
      title: result.idomap.map.title,
      description: result.idomap.map.description,
      tags: result.idomap.map.tags,
      license: result.idomap.map.license,
      center: result.idomap.map.center,
      zoom: result.idomap.map.zoom,
    },
    baseMapId: knownBaseMap.id,
    styleOptions: result.idomap.styleOptions ?? undefined,
    choropleth,
    features,
    groups: result.idomap.groups,
    legendEntries: (result.idomap.legendEntries ?? []) as LegendEntry[],
    pendingIconMigrations,
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
