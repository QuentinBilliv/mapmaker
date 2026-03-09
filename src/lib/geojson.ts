import type { Doc } from "../../convex/_generated/dataModel";

export interface MapFeatureProperties {
  id: string;
  label: string;
  color: string;
  opacity: number;
  layerId: string;
  layerName: string;
  sourceText: string;
  sourceUrl?: string;
  featureType: "polygon" | "polyline" | "point";
}

export interface ExportedMap {
  type: "FeatureCollection";
  properties: {
    title: string;
    description: string;
    tags: string[];
    license: string;
    exportedAt: string;
    generator: "mapmaker";
  };
  features: GeoJSON.Feature[];
}

export function featureToGeoJSON(
  feature: Doc<"features">,
  layerName: string
): GeoJSON.Feature {
  const geometry = JSON.parse(feature.geometry);
  return {
    type: "Feature",
    geometry,
    properties: {
      id: feature._id,
      label: feature.label,
      color: feature.color,
      opacity: feature.opacity,
      layerId: feature.layerId,
      layerName,
      sourceText: feature.sourceText,
      sourceUrl: feature.sourceUrl,
      featureType: feature.type,
    } satisfies MapFeatureProperties,
  };
}

export function exportMap(
  map: Doc<"maps">,
  features: Doc<"features">[],
  layers: Doc<"layers">[]
): ExportedMap {
  const layerMap = new Map(layers.map((l) => [l._id, l.name]));

  return {
    type: "FeatureCollection",
    properties: {
      title: map.title,
      description: map.description,
      tags: map.tags,
      license: map.license,
      exportedAt: new Date().toISOString(),
      generator: "mapmaker",
    },
    features: features.map((f) =>
      featureToGeoJSON(f, layerMap.get(f.layerId) ?? "Unnamed")
    ),
  };
}

export function geometryTypeToFeatureType(
  geoType: string
): "polygon" | "polyline" | "point" {
  switch (geoType) {
    case "Polygon":
    case "MultiPolygon":
      return "polygon";
    case "LineString":
    case "MultiLineString":
      return "polyline";
    case "Point":
    case "MultiPoint":
      return "point";
    default:
      return "point";
  }
}
