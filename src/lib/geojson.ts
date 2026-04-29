export interface MapFeatureProperties {
  id: string;
  label: string;
  color: string;
  opacity: number;
  featureType: "polygon" | "polyline" | "point" | "text";
}

export interface ExportedMap {
  type: "FeatureCollection";
  properties: {
    title: string;
    description: string;
    tags: string[];
    exportedAt: string;
    generator: "idomaps";
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

export type LngLatBounds = [[number, number], [number, number]];

export function computeFeaturesBounds(
  features: { geometry: GeoJSON.Geometry }[]
): LngLatBounds | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  let hasCoords = false;

  function visit(coords: unknown) {
    if (typeof (coords as number[])[0] === "number" && typeof (coords as number[])[1] === "number") {
      const [lng, lat] = coords as [number, number];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      hasCoords = true;
      return;
    }
    for (const child of coords as unknown[]) visit(child);
  }

  for (const f of features) {
    const g = f.geometry;
    if ("coordinates" in g) visit(g.coordinates);
  }

  if (!hasCoords) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
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
