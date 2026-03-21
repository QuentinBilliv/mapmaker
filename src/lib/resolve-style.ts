import type {
  FeatureData,
  LegendEntry,
  PointLegendEntry,
  PolylineLegendEntry,
  PolygonLegendEntry,
  PointFeature,
  PolylineFeature,
  PolygonFeature,
} from "./types";

export function resolveFeatureStyle(feature: FeatureData, legendEntries: LegendEntry[]): FeatureData {
  if (!feature.legendEntryId) return feature;
  const entry = legendEntries.find((e) => e.id === feature.legendEntryId);
  if (!entry || entry.featureType !== feature.type) return feature;

  switch (entry.featureType) {
    case "point": {
      const e = entry as PointLegendEntry;
      return { ...feature, color: e.color, opacity: e.opacity, size: e.size, shape: e.shape, icon: e.icon, customSvg: e.customSvg, borderColor: e.borderColor, borderWidth: e.borderWidth } as PointFeature;
    }
    case "polyline": {
      const e = entry as PolylineLegendEntry;
      return { ...feature, color: e.color, opacity: e.opacity, smoothing: e.smoothing, strokeWidth: e.strokeWidth, lineStyle: e.lineStyle, arrowStyle: e.arrowStyle, lineDecoration: e.lineDecoration, decorationSpacing: e.decorationSpacing } as PolylineFeature;
    }
    case "polygon": {
      const e = entry as PolygonLegendEntry;
      return { ...feature, color: e.color, opacity: e.opacity, smoothing: e.smoothing, strokeWidth: e.strokeWidth, lineStyle: e.lineStyle, lineDecoration: e.lineDecoration, decorationSpacing: e.decorationSpacing, fillPattern: e.fillPattern } as PolygonFeature;
    }
  }
}

export function resolveAllFeatures(features: FeatureData[], legendEntries: LegendEntry[]): FeatureData[] {
  if (legendEntries.length === 0) return features;
  return features.map((f) => resolveFeatureStyle(f, legendEntries));
}

export function deduceLegendEntry(feature: FeatureData, label: string): Omit<PointLegendEntry, "id" | "order"> | Omit<PolylineLegendEntry, "id" | "order"> | Omit<PolygonLegendEntry, "id" | "order"> {
  const base = { label, color: feature.color, opacity: feature.opacity };
  switch (feature.type) {
    case "point":
      return { ...base, featureType: "point", size: feature.size, shape: feature.shape, icon: feature.icon, customSvg: feature.customSvg, borderColor: feature.borderColor, borderWidth: feature.borderWidth };
    case "polyline":
      return { ...base, featureType: "polyline", smoothing: feature.smoothing, strokeWidth: feature.strokeWidth, lineStyle: feature.lineStyle, arrowStyle: feature.arrowStyle, lineDecoration: feature.lineDecoration, decorationSpacing: feature.decorationSpacing };
    case "polygon":
      return { ...base, featureType: "polygon", smoothing: feature.smoothing, strokeWidth: feature.strokeWidth, lineStyle: feature.lineStyle, lineDecoration: feature.lineDecoration, decorationSpacing: feature.decorationSpacing, fillPattern: feature.fillPattern };
    case "text":
      return { ...base, featureType: "point", size: 1, shape: "circle", borderColor: "#ffffff", borderWidth: 0 };
  }
}

export function legendEntryToSyntheticFeature(entry: LegendEntry): FeatureData {
  const base = {
    id: entry.id,
    layerId: "default",
    label: entry.label,
    showLabel: false,
    color: entry.color,
    opacity: entry.opacity,
    order: 0,
    geometry: { type: "Point" as const, coordinates: [0, 0] },
  };
  switch (entry.featureType) {
    case "point":
      return { ...base, type: "point", size: entry.size, shape: entry.shape, icon: entry.icon, customSvg: entry.customSvg, borderColor: entry.borderColor, borderWidth: entry.borderWidth };
    case "polyline":
      return { ...base, type: "polyline", smoothing: entry.smoothing, strokeWidth: entry.strokeWidth, lineStyle: entry.lineStyle, arrowStyle: entry.arrowStyle, lineDecoration: entry.lineDecoration, decorationSpacing: entry.decorationSpacing, geometry: { type: "LineString" as const, coordinates: [[0, 0], [1, 1]] } };
    case "polygon":
      return { ...base, type: "polygon", smoothing: entry.smoothing, strokeWidth: entry.strokeWidth, lineStyle: entry.lineStyle, lineDecoration: entry.lineDecoration, decorationSpacing: entry.decorationSpacing, fillPattern: entry.fillPattern, geometry: { type: "Polygon" as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } };
  }
}
