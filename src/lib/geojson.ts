export interface MapFeatureProperties {
  id: string;
  label: string;
  color: string;
  opacity: number;
  layerId: string;
  layerName: string;
  featureType: "polygon" | "polyline" | "point" | "text";
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

export function parseGeometry(raw: string): GeoJSON.Geometry | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
