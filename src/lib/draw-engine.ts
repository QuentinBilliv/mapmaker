import maplibregl from "maplibre-gl";
import { COLORS } from "./defaults";
import { toMercatorY, fromMercatorY } from "./geo-math";

export type DrawMode = "select" | "polygon" | "rectangle" | "circle" | "polyline" | "point" | "arrow" | "double-arrow" | "text";

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

  if (state.mode === "rectangle" && allPoints.length === 2) {
    const ring = rectangleRing(allPoints[0], allPoints[1]);
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: {},
    });
  }

  if (state.mode === "circle" && allPoints.length === 2) {
    const ring = circleRing(allPoints[0], allPoints[1]);
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: {},
    });
  }

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
  if ((mode === "point" || mode === "text") && points.length === 1) {
    return { type: "Point", coordinates: points[0] };
  }
  if ((mode === "polyline" || mode === "arrow" || mode === "double-arrow") && points.length >= 2) {
    return { type: "LineString", coordinates: points };
  }
  if (mode === "rectangle" && points.length === 2) {
    return { type: "Polygon", coordinates: [rectangleRing(points[0], points[1])] };
  }
  if (mode === "circle" && points.length === 2) {
    return { type: "Polygon", coordinates: [circleRing(points[0], points[1])] };
  }
  if (mode === "polygon" && points.length >= 3) {
    return {
      type: "Polygon",
      coordinates: [[...points, points[0]]],
    };
  }
  return null;
}

function rectangleRing(
  a: [number, number],
  b: [number, number]
): [number, number][] {
  return [
    [a[0], a[1]],
    [b[0], a[1]],
    [b[0], b[1]],
    [a[0], b[1]],
    [a[0], a[1]],
  ];
}

const CIRCLE_SEGMENTS = 64;


function circleRing(
  center: [number, number],
  edge: [number, number]
): [number, number][] {
  const cx = center[0];
  const cy = toMercatorY(center[1]);
  const ex = edge[0];
  const ey = toMercatorY(edge[1]);
  const dx = ex - cx;
  const dy = ey - cy;
  const radius = Math.sqrt(dx * dx + dy * dy);
  const ring: [number, number][] = [];
  for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const angle = (2 * Math.PI * i) / CIRCLE_SEGMENTS;
    ring.push([
      cx + radius * Math.cos(angle),
      fromMercatorY(cy + radius * Math.sin(angle)),
    ]);
  }
  return ring;
}

export function clearDrawPreview(map: maplibregl.Map) {
  const source = map.getSource(DRAW_SOURCE) as maplibregl.GeoJSONSource;
  if (source) {
    source.setData({ type: "FeatureCollection", features: [] });
  }
}
