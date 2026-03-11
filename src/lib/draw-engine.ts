import maplibregl from "maplibre-gl";
import { COLORS } from "./defaults";

export type DrawMode = "select" | "polygon" | "polyline" | "point" | "arrow" | "double-arrow";

export interface DrawState {
  mode: DrawMode;
  currentPoints: [number, number][];
  isDrawing: boolean;
}

const DRAW_SOURCE = "draw-preview";
const DRAW_LINE_LAYER = "draw-preview-line";
const DRAW_FILL_LAYER = "draw-preview-fill";
const DRAW_POINTS_LAYER = "draw-preview-points";

export function initDrawLayers(map: maplibregl.Map) {
  if (map.getSource(DRAW_SOURCE)) return;

  map.addSource(DRAW_SOURCE, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: DRAW_FILL_LAYER,
    type: "fill",
    source: DRAW_SOURCE,
    paint: {
      "fill-color": COLORS.accent,
      "fill-opacity": 0.15,
    },
    filter: ["==", "$type", "Polygon"],
  });

  map.addLayer({
    id: DRAW_LINE_LAYER,
    type: "line",
    source: DRAW_SOURCE,
    paint: {
      "line-color": COLORS.accent,
      "line-width": 2,
      "line-dasharray": [3, 2],
    },
  });

  map.addLayer({
    id: DRAW_POINTS_LAYER,
    type: "circle",
    source: DRAW_SOURCE,
    paint: {
      "circle-radius": 5,
      "circle-color": COLORS.accent,
      "circle-stroke-color": COLORS.white,
      "circle-stroke-width": 2,
    },
    filter: ["==", "$type", "Point"],
  });
}

export function updateDrawPreview(
  map: maplibregl.Map,
  state: DrawState,
  cursor?: [number, number]
) {
  const source = map.getSource(DRAW_SOURCE) as maplibregl.GeoJSONSource;
  if (!source) return;

  const features: GeoJSON.Feature[] = [];
  const points = [...state.currentPoints];

  if (points.length === 0 && !cursor) {
    source.setData({ type: "FeatureCollection", features: [] });
    return;
  }

  // Show vertices
  for (const pt of points) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: pt },
      properties: {},
    });
  }

  const allPoints = cursor ? [...points, cursor] : points;

  if (state.mode === "polygon" && allPoints.length >= 2) {
    const ring = [...allPoints, allPoints[0]];
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: {},
    });
  }

  if ((state.mode === "polyline" || state.mode === "arrow" || state.mode === "double-arrow") && allPoints.length >= 2) {
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: allPoints },
      properties: {},
    });
  }

  source.setData({ type: "FeatureCollection", features });
}

export function buildGeometry(
  mode: DrawMode,
  points: [number, number][]
): GeoJSON.Geometry | null {
  if (mode === "point" && points.length === 1) {
    return { type: "Point", coordinates: points[0] };
  }
  if ((mode === "polyline" || mode === "arrow" || mode === "double-arrow") && points.length >= 2) {
    return { type: "LineString", coordinates: points };
  }
  if (mode === "polygon" && points.length >= 3) {
    return {
      type: "Polygon",
      coordinates: [[...points, points[0]]],
    };
  }
  return null;
}

export function clearDrawPreview(map: maplibregl.Map) {
  const source = map.getSource(DRAW_SOURCE) as maplibregl.GeoJSONSource;
  if (source) {
    source.setData({ type: "FeatureCollection", features: [] });
  }
}
