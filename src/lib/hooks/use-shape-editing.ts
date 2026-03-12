"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureData } from "@/lib/types";
import { parseGeometry } from "@/lib/geojson";
import { COLORS } from "@/lib/defaults";
import { MOVE_ICON_ID, ensureMoveIcon } from "@/lib/move-icon";

const SRC = "shape-edit";
const LAYER_HANDLE = "shape-edit-handles";
const LAYER_CENTER = "shape-edit-center";
const LAYER_OUTLINE = "shape-edit-outline";

type Coord = [number, number];

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function toMercatorY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

function fromMercatorY(y: number): number {
  return (360 / Math.PI) * Math.atan(Math.exp((y * Math.PI) / 180)) - 90;
}

function getRingCoords(f: FeatureData): Coord[] {
  const g = parseGeometry(f.geometry);
  if (!g || g.type !== "Polygon") return [];
  return (g as GeoJSON.Polygon).coordinates[0] as Coord[];
}

function rectCorners(f: FeatureData): { a: Coord; b: Coord } | null {
  const ring = getRingCoords(f);
  if (ring.length < 5) return null;
  return { a: ring[0], b: ring[2] };
}

function circleParams(f: FeatureData): { center: Coord; radius: number } | null {
  const ring = getRingCoords(f);
  if (ring.length < 4) return null;
  let cx = 0, cy = 0;
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    cx += ring[i][0];
    cy += ring[i][1];
  }
  cx /= n;
  cy /= n;
  const mcy = toMercatorY(cy);
  const mey = toMercatorY(ring[0][1]);
  const dx = ring[0][0] - cx;
  const dy = mey - mcy;
  return { center: [cx, cy], radius: Math.sqrt(dx * dx + dy * dy) };
}

function buildRectGeometry(a: Coord, b: Coord): string {
  const ring: Coord[] = [
    [a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]],
  ];
  return JSON.stringify({ type: "Polygon", coordinates: [ring] });
}

function buildCircleGeometry(center: Coord, radius: number): string {
  const cx = center[0];
  const mcy = toMercatorY(center[1]);
  const segments = 64;
  const ring: Coord[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    ring.push([
      cx + radius * Math.cos(angle),
      fromMercatorY(mcy + radius * Math.sin(angle)),
    ]);
  }
  return JSON.stringify({ type: "Polygon", coordinates: [ring] });
}

function rectHandles(a: Coord, b: Coord): GeoJSON.FeatureCollection {
  const corners: Coord[] = [
    [a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]],
  ];
  const center: Coord = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const outline: Coord[] = [...corners, corners[0]];
  const features: GeoJSON.Feature[] = corners.map((c, i) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: c },
    properties: { t: "corner", index: i },
  }));
  features.push({
    type: "Feature",
    geometry: { type: "Point", coordinates: center },
    properties: { t: "center" },
  });
  features.push({
    type: "Feature",
    geometry: { type: "LineString", coordinates: outline },
    properties: { t: "outline" },
  });
  return { type: "FeatureCollection", features };
}

function circleHandles(center: Coord, radius: number): GeoJSON.FeatureCollection {
  const edgePoint: Coord = [center[0] + radius, fromMercatorY(toMercatorY(center[1]))];
  const segments = 64;
  const ring: Coord[] = [];
  const mcy = toMercatorY(center[1]);
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    ring.push([
      center[0] + radius * Math.cos(angle),
      fromMercatorY(mcy + radius * Math.sin(angle)),
    ]);
  }
  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Point", coordinates: center }, properties: { t: "center" } },
      { type: "Feature", geometry: { type: "Point", coordinates: edgePoint }, properties: { t: "edge" } },
      { type: "Feature", geometry: { type: "LineString", coordinates: ring }, properties: { t: "outline" } },
    ],
  };
}

function ensureLayers(map: maplibregl.Map) {
  if (!map.getSource(SRC)) map.addSource(SRC, { type: "geojson", data: EMPTY });
  ensureMoveIcon(map);
  if (!map.getLayer(LAYER_OUTLINE)) {
    map.addLayer({
      id: LAYER_OUTLINE, type: "line", source: SRC,
      paint: { "line-color": COLORS.accent, "line-width": 2, "line-dasharray": [3, 2] },
      filter: ["==", ["get", "t"], "outline"],
    });
  }
  if (!map.getLayer(LAYER_HANDLE)) {
    map.addLayer({
      id: LAYER_HANDLE, type: "circle", source: SRC,
      paint: {
        "circle-radius": ["case", ["==", ["get", "t"], "center"], 12, 6],
        "circle-color": ["case", ["==", ["get", "t"], "center"], "transparent", COLORS.accent],
        "circle-stroke-color": ["case", ["==", ["get", "t"], "center"], "transparent", COLORS.white],
        "circle-stroke-width": 2,
      },
      filter: ["==", "$type", "Point"],
    });
  }
  if (!map.getLayer(LAYER_CENTER)) {
    map.addLayer({
      id: LAYER_CENTER, type: "symbol", source: SRC,
      layout: { "icon-image": MOVE_ICON_ID, "icon-allow-overlap": true, "icon-size": 1 },
      filter: ["==", ["get", "t"], "center"],
    });
  }
  if (map.getLayer(LAYER_OUTLINE)) map.moveLayer(LAYER_OUTLINE);
  if (map.getLayer(LAYER_HANDLE)) map.moveLayer(LAYER_HANDLE);
  if (map.getLayer(LAYER_CENTER)) map.moveLayer(LAYER_CENTER);
}

function setOverlay(map: maplibregl.Map, data: GeoJSON.FeatureCollection) {
  const s = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
  if (s) s.setData(data);
}

interface RectCornerDrag { kind: "rect-corner"; cornerIndex: number; id: string; a: Coord; b: Coord }
interface RectCenterDrag { kind: "rect-center"; id: string; a: Coord; b: Coord; startLng: number; startLat: number }
interface CircleCenterDrag { kind: "circle-center"; id: string; center: Coord; radius: number; startLng: number; startLat: number }
interface CircleEdgeDrag { kind: "circle-edge"; id: string; center: Coord; radius: number }
type DragState = RectCornerDrag | RectCenterDrag | CircleCenterDrag | CircleEdgeDrag;

export function useShapeEditing(
  mapRef: React.RefObject<maplibregl.Map | null>,
  selectedFeature: FeatureData | null,
  updateFeature: (id: string, updates: Partial<FeatureData>) => void,
  styleVersion: number
): React.RefObject<boolean> {
  const interactingRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const featRef = useRef(selectedFeature);
  featRef.current = selectedFeature;
  const updateRef = useRef(updateFeature);
  updateRef.current = updateFeature;

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const map = m;

    function refresh() {
      if (!map.isStyleLoaded()) return;
      ensureLayers(map);
      const f = featRef.current;
      if (!f || !f.shapeOrigin) { setOverlay(map, EMPTY); return; }
      if (f.shapeOrigin === "rectangle") {
        const rc = rectCorners(f);
        if (rc) setOverlay(map, rectHandles(rc.a, rc.b));
      } else {
        const cp = circleParams(f);
        if (cp) setOverlay(map, circleHandles(cp.center, cp.radius));
      }
    }

    function onMouseDown(e: maplibregl.MapMouseEvent) {
      const f = featRef.current;
      if (!f || !f.shapeOrigin || !map.getLayer(LAYER_HANDLE)) return;

      const hits = map.queryRenderedFeatures(e.point, { layers: [LAYER_HANDLE] });
      if (hits.length === 0) return;

      const props = hits[0].properties;
      e.preventDefault();
      interactingRef.current = true;
      map.dragPan.disable();
      map.getCanvas().style.cursor = "grabbing";

      if (f.shapeOrigin === "rectangle") {
        const rc = rectCorners(f);
        if (!rc) return;
        if (props?.t === "center") {
          dragRef.current = {
            kind: "rect-center", id: f.id, a: rc.a, b: rc.b,
            startLng: e.lngLat.lng, startLat: e.lngLat.lat,
          };
        } else {
          dragRef.current = { kind: "rect-corner", cornerIndex: props?.index as number, id: f.id, a: rc.a, b: rc.b };
        }
      } else {
        const cp = circleParams(f);
        if (!cp) return;
        if (props?.t === "center") {
          dragRef.current = {
            kind: "circle-center", id: f.id,
            center: cp.center, radius: cp.radius,
            startLng: e.lngLat.lng, startLat: e.lngLat.lat,
          };
        } else {
          dragRef.current = { kind: "circle-edge", id: f.id, center: cp.center, radius: cp.radius };
        }
      }
    }

    function onMouseMove(e: maplibregl.MapMouseEvent) {
      const d = dragRef.current;
      if (!d) {
        const f = featRef.current;
        if (!f || !f.shapeOrigin || !map.getLayer(LAYER_HANDLE)) return;
        const hits = map.queryRenderedFeatures(e.point, { layers: [LAYER_HANDLE] });
        map.getCanvas().style.cursor = hits.length > 0 ? "grab" : "";
        return;
      }

      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;

      if (d.kind === "rect-corner") {
        const i = d.cornerIndex;
        const newA: Coord = [...d.a];
        const newB: Coord = [...d.b];
        if (i === 0) { newA[0] = lng; newA[1] = lat; }
        else if (i === 1) { newB[0] = lng; newA[1] = lat; }
        else if (i === 2) { newB[0] = lng; newB[1] = lat; }
        else { newA[0] = lng; newB[1] = lat; }
        d.a = newA;
        d.b = newB;
        setOverlay(map, rectHandles(newA, newB));
      } else if (d.kind === "rect-center") {
        const dlng = lng - d.startLng;
        const dlat = lat - d.startLat;
        d.a = [d.a[0] + dlng, d.a[1] + dlat];
        d.b = [d.b[0] + dlng, d.b[1] + dlat];
        d.startLng = lng;
        d.startLat = lat;
        setOverlay(map, rectHandles(d.a, d.b));
      } else if (d.kind === "circle-center") {
        const dlng = lng - d.startLng;
        const dlat = lat - d.startLat;
        d.center = [d.center[0] + dlng, d.center[1] + dlat];
        d.startLng = lng;
        d.startLat = lat;
        setOverlay(map, circleHandles(d.center, d.radius));
      } else if (d.kind === "circle-edge") {
        const dx = lng - d.center[0];
        const dy = toMercatorY(lat) - toMercatorY(d.center[1]);
        d.radius = Math.sqrt(dx * dx + dy * dy);
        setOverlay(map, circleHandles(d.center, d.radius));
      }
    }

    function onMouseUp() {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";
      setTimeout(() => { interactingRef.current = false; }, 0);

      if (d.kind === "rect-corner" || d.kind === "rect-center") {
        updateRef.current(d.id, { geometry: buildRectGeometry(d.a, d.b) });
      } else if (d.kind === "circle-center") {
        updateRef.current(d.id, { geometry: buildCircleGeometry(d.center, d.radius) });
      } else if (d.kind === "circle-edge") {
        updateRef.current(d.id, { geometry: buildCircleGeometry(d.center, d.radius) });
      }
    }

    const setup = () => {
      refresh();
      map.on("mousedown", onMouseDown);
      map.on("mousemove", onMouseMove);
      map.on("mouseup", onMouseUp);
    };

    if (map.isStyleLoaded()) setup();
    else map.once("load", setup);

    return () => {
      if (dragRef.current) { map.dragPan.enable(); dragRef.current = null; }
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      if (map.isStyleLoaded() && map.getSource(SRC)) setOverlay(map, EMPTY);
    };
  }, [mapRef]);

  const selectedId = selectedFeature?.id ?? null;
  const selectedGeometry = selectedFeature?.geometry ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const update = () => {
      if (cancelled) return;
      if (!map.isStyleLoaded()) { map.once("idle", update); return; }
      ensureLayers(map);
      const f = featRef.current;
      if (!f || !f.shapeOrigin) { setOverlay(map, EMPTY); return; }
      if (f.shapeOrigin === "rectangle") {
        const rc = rectCorners(f);
        if (rc) setOverlay(map, rectHandles(rc.a, rc.b));
      } else {
        const cp = circleParams(f);
        if (cp) setOverlay(map, circleHandles(cp.center, cp.radius));
      }
    };

    update();
    return () => { cancelled = true; map.off("idle", update); };
  }, [mapRef, selectedId, selectedGeometry, styleVersion]);

  return interactingRef;
}
