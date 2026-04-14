"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import toast from "react-hot-toast";
import type { FeatureData, FeatureUpdate } from "@/lib/types";
import { COLORS } from "@/lib/defaults";
import { MOVE_ICON_ID, ensureMoveIcon } from "@/lib/move-icon";
import { ROTATE_ICON_ID, ensureRotateIcon } from "@/lib/rotate-icon";
import { type Coord, type BboxInfo, toMercatorY, fromMercatorY, rotateCoords, computeBbox, rotateBbox } from "@/lib/geo-math";
import { EMPTY_FC, setOverlayData, beginDrag, endDrag } from "./editing-helpers";

const SRC = "vertex-edit";
const LAYER_VERTEX = "vertex-edit-points";
const LAYER_MID = "vertex-edit-midpoints";
const LAYER_EDGE = "vertex-edit-edges";
const LAYER_MOVE_HIT = "vertex-edit-move-hit";
const LAYER_MOVE_ICON = "vertex-edit-move-icon";
const LAYER_ROTATE_HIT = "vertex-edit-rotate-hit";
const LAYER_ROTATE_ICON = "vertex-edit-rotate-icon";
const LAYER_ROTATE_ARM = "vertex-edit-rotate-arm";
const LAYER_BBOX = "vertex-edit-bbox";

interface RingSegment {
  offset: number;
  count: number;
  closed: boolean;
}

interface CoordsInfo {
  coords: Coord[];
  segments: RingSegment[];
}

function getCoords(f: FeatureData): CoordsInfo {
  const g = f.geometry;
  if (g.type === "Point") return { coords: [g.coordinates as Coord], segments: [{ offset: 0, count: 1, closed: false }] };
  if (g.type === "LineString") {
    const c = g.coordinates as Coord[];
    return { coords: c, segments: [{ offset: 0, count: c.length, closed: false }] };
  }
  if (g.type === "Polygon") {
    const coords: Coord[] = [];
    const segments: RingSegment[] = [];
    for (const ring of g.coordinates) {
      const open = (ring as Coord[]).slice(0, -1);
      segments.push({ offset: coords.length, count: open.length, closed: true });
      coords.push(...open);
    }
    return { coords, segments };
  }
  if (g.type === "MultiPolygon") {
    const coords: Coord[] = [];
    const segments: RingSegment[] = [];
    for (const poly of g.coordinates) {
      for (const ring of poly) {
        const open = (ring as Coord[]).slice(0, -1);
        segments.push({ offset: coords.length, count: open.length, closed: true });
        coords.push(...open);
      }
    }
    return { coords, segments };
  }
  if (g.type === "MultiLineString") {
    const coords: Coord[] = [];
    const segments: RingSegment[] = [];
    for (const line of g.coordinates) {
      segments.push({ offset: coords.length, count: line.length, closed: false });
      coords.push(...(line as Coord[]));
    }
    return { coords, segments };
  }
  return { coords: [], segments: [] };
}

function deleteVertex(
  globalIdx: number,
  coords: Coord[],
  segments: RingSegment[],
): { coords: Coord[]; segments: RingSegment[] } | { error: string } {
  const segIdx = segments.findIndex((s) => globalIdx >= s.offset && globalIdx < s.offset + s.count);
  if (segIdx === -1) return { error: "Vertex not found" };
  const seg = segments[segIdx];
  const min = seg.closed ? 3 : 2;
  if (seg.count <= min) {
    return { error: `Cannot delete — minimum ${min} points` };
  }
  const newCoords = [...coords.slice(0, globalIdx), ...coords.slice(globalIdx + 1)];
  const newSegments = segments.map((s, i) => {
    if (i === segIdx) return { ...s, count: s.count - 1 };
    if (s.offset > globalIdx) return { ...s, offset: s.offset - 1 };
    return s;
  });
  return { coords: newCoords, segments: newSegments };
}

function centroid(coords: Coord[]): Coord {
  if (coords.length === 0) return [0, 0];
  let x = 0, y = 0;
  for (const c of coords) { x += c[0]; y += c[1]; }
  return [x / coords.length, y / coords.length];
}

function toGeometry(coords: Coord[], f: FeatureData, segments: RingSegment[]): GeoJSON.Geometry {
  if (f.type === "point" || f.type === "text") return { type: "Point", coordinates: coords[0] };
  const g = f.geometry;
  if (g.type === "Polygon") {
    const rings = segments.map((s) => {
      const ring = coords.slice(s.offset, s.offset + s.count);
      return [...ring, ring[0]];
    });
    return { type: "Polygon", coordinates: rings };
  }
  if (g.type === "MultiPolygon") {
    const polys: number[][][][] = [];
    let si = 0;
    for (const poly of g.coordinates) {
      const rings: number[][][] = [];
      for (let r = 0; r < poly.length; r++) {
        const s = segments[si++];
        const ring = coords.slice(s.offset, s.offset + s.count);
        rings.push([...ring, ring[0]]);
      }
      polys.push(rings);
    }
    return { type: "MultiPolygon", coordinates: polys };
  }
  if (g.type === "MultiLineString") {
    const lines = segments.map((s) => coords.slice(s.offset, s.offset + s.count));
    return { type: "MultiLineString", coordinates: lines };
  }
  if (g.type === "LineString") return { type: "LineString", coordinates: coords };
  return g;
}

function pointRotateHandle(coord: Coord, map: maplibregl.Map): BboxInfo {
  const px = map.project([coord[0], coord[1]]);
  const size = 30;
  const tl = map.unproject([px.x - size, px.y - size]);
  const br = map.unproject([px.x + size, px.y + size]);
  const topPx = map.unproject([px.x, px.y - size]);
  const handlePx = map.unproject([px.x, px.y - size - 20]);
  const corners: Coord[] = [
    [tl.lng, tl.lat],
    [br.lng, tl.lat],
    [br.lng, br.lat],
    [tl.lng, br.lat],
  ];
  return {
    corners,
    center: coord,
    topCenter: [topPx.lng, topPx.lat],
    handlePos: [handlePx.lng, handlePx.lat],
  };
}

function buildFC(
  coords: Coord[],
  f: FeatureData,
  segments: RingSegment[],
  bbox?: BboxInfo,
): GeoJSON.FeatureCollection {
  const feats: GeoJSON.Feature[] = [];
  const isPoint = f.type === "point" || f.type === "text";

  if (!isPoint) {
    for (let i = 0; i < coords.length; i++) {
      feats.push({ type: "Feature", geometry: { type: "Point", coordinates: coords[i] }, properties: { t: "v", index: i } });
    }
    let midIdx = 0;
    for (const seg of segments) {
      const end = seg.offset + seg.count;
      const edgeCount = seg.closed ? seg.count : seg.count - 1;
      for (let i = 0; i < edgeCount; i++) {
        const ai = seg.offset + i;
        const bi = seg.closed ? seg.offset + ((i + 1) % seg.count) : ai + 1;
        const a = coords[ai], b = coords[bi];
        feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [(a[0]+b[0])/2, (a[1]+b[1])/2] }, properties: { t: "m", index: midIdx++ } });
      }
      const line = coords.slice(seg.offset, end);
      if (seg.closed && line.length >= 2) {
        feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: [...line, line[0]] }, properties: { t: "e" } });
      } else if (line.length >= 2) {
        feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: line }, properties: { t: "e" } });
      }
    }
  }

  const b = bbox ?? ((!isPoint && coords.length >= 2) ? computeBbox(coords) : null);

  if (b) {
    feats.push({ type: "Feature", geometry: { type: "Point", coordinates: b.center }, properties: { t: "center" } });
    const bboxRing = [...b.corners, b.corners[0]];
    feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: bboxRing }, properties: { t: "bbox" } });
    feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: [b.topCenter, b.handlePos] }, properties: { t: "rotate-arm" } });
    feats.push({ type: "Feature", geometry: { type: "Point", coordinates: b.handlePos }, properties: { t: "rotate" } });
  } else {
    const center = centroid(coords);
    feats.push({ type: "Feature", geometry: { type: "Point", coordinates: center }, properties: { t: "center" } });
  }

  return { type: "FeatureCollection", features: feats };
}

const EMPTY = EMPTY_FC;

function ensureLayers(map: maplibregl.Map) {
  if (!map.getSource(SRC)) map.addSource(SRC, { type: "geojson", data: EMPTY });
  ensureMoveIcon(map);
  ensureRotateIcon(map);
  if (!map.getLayer(LAYER_BBOX)) {
    map.addLayer({ id: LAYER_BBOX, type: "line", source: SRC, paint: { "line-color": COLORS.accent, "line-width": 1.5, "line-opacity": 0.5 }, filter: ["==", ["get", "t"], "bbox"] });
  }
  if (!map.getLayer(LAYER_EDGE)) {
    map.addLayer({ id: LAYER_EDGE, type: "line", source: SRC, paint: { "line-color": COLORS.accent, "line-width": 2, "line-dasharray": [3, 2] }, filter: ["==", ["get", "t"], "e"] });
  }
  if (!map.getLayer(LAYER_ROTATE_ARM)) {
    map.addLayer({ id: LAYER_ROTATE_ARM, type: "line", source: SRC, paint: { "line-color": COLORS.accent, "line-width": 1, "line-opacity": 0.5 }, filter: ["==", ["get", "t"], "rotate-arm"] });
  }
  if (!map.getLayer(LAYER_MID)) {
    map.addLayer({ id: LAYER_MID, type: "circle", source: SRC, paint: { "circle-radius": 4, "circle-color": COLORS.white, "circle-stroke-color": COLORS.accent, "circle-stroke-width": 2, "circle-opacity": 0.7 }, filter: ["==", ["get", "t"], "m"] });
  }
  if (!map.getLayer(LAYER_VERTEX)) {
    map.addLayer({ id: LAYER_VERTEX, type: "circle", source: SRC, paint: { "circle-radius": 6, "circle-color": COLORS.accent, "circle-stroke-color": COLORS.white, "circle-stroke-width": 2 }, filter: ["==", ["get", "t"], "v"] });
  }
  if (!map.getLayer(LAYER_MOVE_HIT)) {
    map.addLayer({
      id: LAYER_MOVE_HIT, type: "circle", source: SRC,
      paint: { "circle-radius": 12, "circle-color": "transparent", "circle-stroke-color": "transparent", "circle-stroke-width": 0 },
      filter: ["==", ["get", "t"], "center"],
    });
  }
  if (!map.getLayer(LAYER_MOVE_ICON)) {
    map.addLayer({
      id: LAYER_MOVE_ICON, type: "symbol", source: SRC,
      layout: { "icon-image": MOVE_ICON_ID, "icon-allow-overlap": true, "icon-size": 1 },
      filter: ["==", ["get", "t"], "center"],
    });
  }
  if (!map.getLayer(LAYER_ROTATE_HIT)) {
    map.addLayer({
      id: LAYER_ROTATE_HIT, type: "circle", source: SRC,
      paint: { "circle-radius": 16, "circle-color": "transparent", "circle-stroke-color": "transparent", "circle-stroke-width": 0 },
      filter: ["==", ["get", "t"], "rotate"],
    });
  }
  if (!map.getLayer(LAYER_ROTATE_ICON)) {
    map.addLayer({
      id: LAYER_ROTATE_ICON, type: "symbol", source: SRC,
      layout: { "icon-image": ROTATE_ICON_ID, "icon-allow-overlap": true, "icon-size": 1 },
      filter: ["==", ["get", "t"], "rotate"],
    });
  }
  if (map.getLayer(LAYER_BBOX)) map.moveLayer(LAYER_BBOX);
  if (map.getLayer(LAYER_EDGE)) map.moveLayer(LAYER_EDGE);
  if (map.getLayer(LAYER_ROTATE_ARM)) map.moveLayer(LAYER_ROTATE_ARM);
  if (map.getLayer(LAYER_MID)) map.moveLayer(LAYER_MID);
  if (map.getLayer(LAYER_VERTEX)) map.moveLayer(LAYER_VERTEX);
  if (map.getLayer(LAYER_MOVE_HIT)) map.moveLayer(LAYER_MOVE_HIT);
  if (map.getLayer(LAYER_MOVE_ICON)) map.moveLayer(LAYER_MOVE_ICON);
  if (map.getLayer(LAYER_ROTATE_HIT)) map.moveLayer(LAYER_ROTATE_HIT);
  if (map.getLayer(LAYER_ROTATE_ICON)) map.moveLayer(LAYER_ROTATE_ICON);
}

function setOverlay(map: maplibregl.Map, data: GeoJSON.FeatureCollection) {
  setOverlayData(map, SRC, data);
}

type VertexDrag = { kind: "vertex"; idx: number; id: string; coords: Coord[]; segments: RingSegment[]; feat: FeatureData };
type MoveDrag = { kind: "move"; id: string; coords: Coord[]; segments: RingSegment[]; feat: FeatureData; startLng: number; startMercY: number };
type RotateDrag = {
  kind: "rotate"; id: string;
  origCoords: Coord[]; coords: Coord[]; segments: RingSegment[];
  feat: FeatureData;
  center: Coord; startAngle: number;
  origBbox: BboxInfo;
};
type PointRotateDrag = {
  kind: "point-rotate"; id: string;
  feat: FeatureData;
  center: Coord; startAngle: number;
  baseRotation: number;
  currentRotation: number;
  origBbox: BboxInfo;
};
type DragState = VertexDrag | MoveDrag | RotateDrag | PointRotateDrag;

export function useVertexEditing(
  mapRef: React.RefObject<maplibregl.Map | null>,
  selectedFeature: FeatureData | null,
  updateFeature: (id: string, updates: FeatureUpdate) => void,
  styleVersion: number,
  recordSnapshot?: () => void,
): React.RefObject<boolean> {
  const interactingRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const featRef = useRef(selectedFeature);
  featRef.current = selectedFeature;
  const updateRef = useRef(updateFeature);
  updateRef.current = updateFeature;
  const recordRef = useRef(recordSnapshot);
  recordRef.current = recordSnapshot;

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const map = m;

    function refresh() {
      if (!map.isStyleLoaded()) return;
      ensureLayers(map);
      const f = featRef.current;
      if (!f || (f.type === "polygon" && f.shapeOrigin)) { setOverlay(map, EMPTY); return; }
      const isPoint = f.type === "point" || f.type === "text";
      const { coords, segments } = getCoords(f);
      if (isPoint) {
        const bbox = pointRotateHandle(coords[0], map);
        setOverlay(map, buildFC(coords, f, segments, bbox));
      } else {
        setOverlay(map, buildFC(coords, f, segments));
      }
    }

    function onMouseDown(e: maplibregl.MapMouseEvent) {
      if (e.originalEvent.button !== 0) return;
      const f = featRef.current;
      if (!f || (f.type === "polygon" && f.shapeOrigin)) return;

      const rotateHits = map.getLayer(LAYER_ROTATE_HIT)
        ? map.queryRenderedFeatures(e.point, { layers: [LAYER_ROTATE_HIT] })
        : [];
      if (rotateHits.length > 0) {
        recordRef.current?.();
        beginDrag(map, e, interactingRef);
        const { coords, segments } = getCoords(f);
        const isPoint = f.type === "point" || f.type === "text";

        if (isPoint) {
          const center = coords[0];
          const startAngle = Math.atan2(
            toMercatorY(e.lngLat.lat) - toMercatorY(center[1]),
            e.lngLat.lng - center[0]
          );
          const origBbox = pointRotateHandle(center, map);
          dragRef.current = {
            kind: "point-rotate", id: f.id, feat: f,
            center, startAngle,
            baseRotation: f.rotation ?? 0,
            currentRotation: f.rotation ?? 0,
            origBbox,
          };
        } else {
          const origBbox = computeBbox(coords);
          const startAngle = Math.atan2(
            toMercatorY(e.lngLat.lat) - toMercatorY(origBbox.center[1]),
            e.lngLat.lng - origBbox.center[0]
          );
          dragRef.current = {
            kind: "rotate", id: f.id,
            origCoords: coords.map(c => [...c] as Coord),
            coords: coords.map(c => [...c] as Coord),
            segments,
            feat: f, center: origBbox.center, startAngle, origBbox,
          };
        }
        return;
      }

      const moveHits = map.getLayer(LAYER_MOVE_HIT)
        ? map.queryRenderedFeatures(e.point, { layers: [LAYER_MOVE_HIT] })
        : [];
      if (moveHits.length > 0) {
        recordRef.current?.();
        beginDrag(map, e, interactingRef);
        const { coords, segments } = getCoords(f);
        dragRef.current = {
          kind: "move", id: f.id, coords: [...coords], segments, feat: f,
          startLng: e.lngLat.lng, startMercY: toMercatorY(e.lngLat.lat),
        };
        return;
      }

      if (f.type === "point" || f.type === "text") return;
      if (!map.getLayer(LAYER_VERTEX)) return;

      const vHits = map.queryRenderedFeatures(e.point, { layers: [LAYER_VERTEX] });
      if (vHits.length > 0) {
        const idx = vHits[0].properties?.index;
        if (typeof idx !== "number") return;
        recordRef.current?.();
        beginDrag(map, e, interactingRef);
        const { coords, segments } = getCoords(f);
        dragRef.current = { kind: "vertex", idx, id: f.id, coords: [...coords], segments, feat: f };
        return;
      }

      if (!map.getLayer(LAYER_MID)) return;
      const mHits = map.queryRenderedFeatures(e.point, { layers: [LAYER_MID] });
      if (mHits.length > 0) {
        const midIdx = mHits[0].properties?.index;
        if (typeof midIdx !== "number") return;
        recordRef.current?.();
        beginDrag(map, e, interactingRef);
        const { coords, segments } = getCoords(f);
        const newCoords = [...coords];
        let globalIdx = 0;
        let remaining = midIdx;
        for (const seg of segments) {
          const edgeCount = seg.closed ? seg.count : seg.count - 1;
          if (remaining < edgeCount) {
            globalIdx = seg.offset + remaining + 1;
            break;
          }
          remaining -= edgeCount;
          globalIdx = seg.offset + seg.count;
        }
        newCoords.splice(globalIdx, 0, [e.lngLat.lng, e.lngLat.lat]);
        const newSegments = segments.map((s) => {
          if (globalIdx > s.offset && globalIdx <= s.offset + s.count) {
            return { ...s, count: s.count + 1 };
          }
          if (globalIdx <= s.offset) {
            return { ...s, offset: s.offset + 1 };
          }
          return s;
        });
        dragRef.current = { kind: "vertex", idx: globalIdx, id: f.id, coords: newCoords, segments: newSegments, feat: f };
      }
    }

    function onMouseMove(e: maplibregl.MapMouseEvent) {
      const d = dragRef.current;
      if (d) {
        if (d.kind === "vertex") {
          d.coords[d.idx] = [e.lngLat.lng, e.lngLat.lat];
          setOverlay(map, buildFC(d.coords, d.feat, d.segments));
        } else if (d.kind === "move") {
          const dlng = e.lngLat.lng - d.startLng;
          const curMercY = toMercatorY(e.lngLat.lat);
          const dMercY = curMercY - d.startMercY;
          for (let i = 0; i < d.coords.length; i++) {
            d.coords[i] = [d.coords[i][0] + dlng, fromMercatorY(toMercatorY(d.coords[i][1]) + dMercY)];
          }
          d.startLng = e.lngLat.lng;
          d.startMercY = curMercY;
          setOverlay(map, buildFC(d.coords, d.feat, d.segments));
        } else if (d.kind === "rotate") {
          const angle = Math.atan2(
            toMercatorY(e.lngLat.lat) - toMercatorY(d.center[1]),
            e.lngLat.lng - d.center[0]
          );
          const delta = angle - d.startAngle;
          const rotated = rotateCoords(d.origCoords, d.center, delta);
          for (let i = 0; i < d.coords.length; i++) d.coords[i] = rotated[i];
          const rotatedBbox = rotateBbox(d.origBbox, delta);
          setOverlay(map, buildFC(d.coords, d.feat, d.segments, rotatedBbox));
        } else if (d.kind === "point-rotate") {
          const angle = Math.atan2(
            toMercatorY(e.lngLat.lat) - toMercatorY(d.center[1]),
            e.lngLat.lng - d.center[0]
          );
          const delta = angle - d.startAngle;
          d.currentRotation = d.baseRotation - (delta * 180) / Math.PI;
          const rotatedBbox = rotateBbox(d.origBbox, delta);
          setOverlay(map, buildFC([d.center], d.feat, [{ offset: 0, count: 1, closed: false }], rotatedBbox));
          updateRef.current(d.id, { rotation: d.currentRotation });
        }
        return;
      }
      const f = featRef.current;
      if (!f || (f.type === "polygon" && f.shapeOrigin)) return;
      const rotateLayer = map.getLayer(LAYER_ROTATE_HIT) ? [LAYER_ROTATE_HIT] : [];
      const rotateHits = rotateLayer.length > 0 ? map.queryRenderedFeatures(e.point, { layers: rotateLayer }) : [];
      if (rotateHits.length > 0) {
        map.getCanvas().style.cursor = "crosshair";
        return;
      }
      const queryLayers = [LAYER_MOVE_HIT, LAYER_VERTEX, LAYER_MID].filter(id => map.getLayer(id));
      const hits = map.queryRenderedFeatures(e.point, { layers: queryLayers });
      map.getCanvas().style.cursor = hits.length > 0 ? "grab" : "";
    }

    function onMouseUp() {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      endDrag(map, interactingRef);

      if (d.kind === "point-rotate") {
        updateRef.current(d.id, { rotation: d.currentRotation });
      } else {
        updateRef.current(d.id, { geometry: toGeometry(d.coords, d.feat, d.segments) });
      }
    }

    function onContextMenu(e: maplibregl.MapMouseEvent) {
      const f = featRef.current;
      if (!f || f.type === "point" || f.type === "text") return;
      if (f.type === "polygon" && f.shapeOrigin) return;
      if (!map.getLayer(LAYER_VERTEX)) return;
      const vHits = map.queryRenderedFeatures(e.point, { layers: [LAYER_VERTEX] });
      if (vHits.length === 0) return;
      const idx = vHits[0].properties?.index;
      if (typeof idx !== "number") return;
      e.preventDefault();
      const { coords, segments } = getCoords(f);
      const result = deleteVertex(idx, coords, segments);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      recordRef.current?.();
      updateRef.current(f.id, { geometry: toGeometry(result.coords, f, result.segments) });
    }

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);
    map.on("contextmenu", onContextMenu);
    if (map.isStyleLoaded()) refresh();
    else map.once("load", refresh);

    return () => {
      if (dragRef.current) { map.dragPan.enable(); dragRef.current = null; }
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      map.off("contextmenu", onContextMenu);
      if (map.isStyleLoaded() && map.getSource(SRC)) setOverlay(map, EMPTY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, styleVersion]);

  const selectedId = selectedFeature?.id ?? null;
  const selectedGeometry = selectedFeature?.geometry ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const update = () => {
      if (cancelled) return;
      if (!map.isStyleLoaded()) {
        map.once("idle", update);
        return;
      }
      ensureLayers(map);
      const f = featRef.current;
      if (!f || (f.type === "polygon" && f.shapeOrigin)) { setOverlay(map, EMPTY); return; }
      const isPoint = f.type === "point" || f.type === "text";
      const { coords, segments } = getCoords(f);
      if (isPoint) {
        const bbox = pointRotateHandle(coords[0], map);
        setOverlay(map, buildFC(coords, f, segments, bbox));
      } else {
        setOverlay(map, buildFC(coords, f, segments));
      }
    };

    update();

    return () => {
      cancelled = true;
      map.off("idle", update);
    };
  }, [mapRef, selectedId, selectedGeometry, styleVersion]);

  return interactingRef;
}
