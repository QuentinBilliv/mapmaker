import type {
  FeatureData,
  LegendEntry,
  PointLegendEntry,
  PolylineLegendEntry,
  PolygonLegendEntry,
  TextLegendEntry,
  PointFeature,
  PolylineFeature,
  PolygonFeature,
  TextFeature,
} from "./types";

function applyLegendEntry(feature: FeatureData, entry: LegendEntry): FeatureData {
  if (entry.featureType !== feature.type) return feature;
  switch (entry.featureType) {
    case "point": {
      const e = entry as PointLegendEntry;
      return { ...feature, color: e.color, opacity: e.opacity, size: e.size, shape: e.shape, customSvg: e.customSvg, borderColor: e.borderColor, borderWidth: e.borderWidth } as PointFeature;
    }
    case "polyline": {
      const e = entry as PolylineLegendEntry;
      return { ...feature, color: e.color, opacity: e.opacity, smoothing: e.smoothing, strokeWidth: e.strokeWidth, lineStyle: e.lineStyle, arrowStyle: e.arrowStyle, lineDecoration: e.lineDecoration, decorationSpacing: e.decorationSpacing } as PolylineFeature;
    }
    case "polygon": {
      const e = entry as PolygonLegendEntry;
      return { ...feature, color: e.color, opacity: e.opacity, smoothing: e.smoothing, strokeWidth: e.strokeWidth, lineStyle: e.lineStyle, lineDecoration: e.lineDecoration, decorationSpacing: e.decorationSpacing, fillPattern: e.fillPattern } as PolygonFeature;
    }
    case "text": {
      const e = entry as TextLegendEntry;
      return { ...feature, color: e.color, opacity: e.opacity, fontSize: e.fontSize, fontFamily: e.fontFamily, textBorderEnabled: e.textBorderEnabled, textBorderColor: e.textBorderColor, textBorderWidth: e.textBorderWidth } as TextFeature;
    }
  }
}

export function resolveFeatureStyle(feature: FeatureData, legendEntries: LegendEntry[]): FeatureData {
  if (!feature.legendEntryId) return feature;
  const entry = legendEntries.find((e) => e.id === feature.legendEntryId);
  if (!entry) return feature;
  return applyLegendEntry(feature, entry);
}

export function resolveAllFeatures(features: FeatureData[], legendEntries: LegendEntry[]): FeatureData[] {
  if (legendEntries.length === 0) return features;
  const entryMap = new Map(legendEntries.map((e) => [e.id, e]));
  return features.map((f) => {
    if (!f.legendEntryId) return f;
    const entry = entryMap.get(f.legendEntryId);
    if (!entry) return f;
    return applyLegendEntry(f, entry);
  });
}

export function deduceLegendEntry(feature: FeatureData, label: string): Omit<PointLegendEntry, "id" | "order"> | Omit<PolylineLegendEntry, "id" | "order"> | Omit<PolygonLegendEntry, "id" | "order"> | Omit<TextLegendEntry, "id" | "order"> {
  const base = { label, color: feature.color, opacity: feature.opacity };
  switch (feature.type) {
    case "point":
      return { ...base, featureType: "point", size: feature.size, shape: feature.shape, customSvg: feature.customSvg, borderColor: feature.borderColor, borderWidth: feature.borderWidth };
    case "polyline":
      return { ...base, featureType: "polyline", smoothing: feature.smoothing, strokeWidth: feature.strokeWidth, lineStyle: feature.lineStyle, arrowStyle: feature.arrowStyle, lineDecoration: feature.lineDecoration, decorationSpacing: feature.decorationSpacing };
    case "polygon":
      return { ...base, featureType: "polygon", smoothing: feature.smoothing, strokeWidth: feature.strokeWidth, lineStyle: feature.lineStyle, lineDecoration: feature.lineDecoration, decorationSpacing: feature.decorationSpacing, fillPattern: feature.fillPattern };
    case "text":
      return { ...base, featureType: "text", fontSize: feature.fontSize, fontFamily: feature.fontFamily, textBorderEnabled: feature.textBorderEnabled, textBorderColor: feature.textBorderColor, textBorderWidth: feature.textBorderWidth };
  }
}

export function legendEntryToSyntheticFeature(entry: LegendEntry): FeatureData {
  const base = {
    id: entry.id,
    layerId: "default",
    label: entry.label,
    description: "",
    color: entry.color,
    opacity: entry.opacity,
    order: 0,
    geometry: { type: "Point" as const, coordinates: [0, 0] },
  };
  switch (entry.featureType) {
    case "point":
      return { ...base, type: "point", size: entry.size, shape: entry.shape, customSvg: entry.customSvg, borderColor: entry.borderColor, borderWidth: entry.borderWidth };
    case "polyline":
      return { ...base, type: "polyline", smoothing: entry.smoothing, strokeWidth: entry.strokeWidth, lineStyle: entry.lineStyle, arrowStyle: entry.arrowStyle, lineDecoration: entry.lineDecoration, decorationSpacing: entry.decorationSpacing, geometry: { type: "LineString" as const, coordinates: [[0, 0], [1, 1]] } };
    case "polygon":
      return { ...base, type: "polygon", smoothing: entry.smoothing, strokeWidth: entry.strokeWidth, lineStyle: entry.lineStyle, lineDecoration: entry.lineDecoration, decorationSpacing: entry.decorationSpacing, fillPattern: entry.fillPattern, geometry: { type: "Polygon" as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } };
    case "text":
      return { ...base, type: "text", textContent: "Text", fontSize: entry.fontSize, fontFamily: entry.fontFamily, textBorderEnabled: entry.textBorderEnabled, textBorderColor: entry.textBorderColor, textBorderWidth: entry.textBorderWidth };
  }
}
