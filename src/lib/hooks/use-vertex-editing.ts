"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureData } from "@/lib/types";
import { COLORS } from "@/lib/defaults";
import { MOVE_ICON_ID, ensureMoveIcon } from "@/lib/move-icon";
import { ROTATE_ICON_ID, ensureRotateIcon } from "@/lib/rotate-icon";
import { type Coord, type BboxInfo, toMercatorY, rotateCoords, computeBbox, rotateBbox } from "@/lib/geo-math";

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

function getCoords(f: FeatureData): Coord[] {
  const g = f.geometry;
  if (g.type === "Point") return [(g as GeoJSON.Point).coordinates as Coord];
  if (g.type === "LineString") return (g as GeoJSON.LineString).coordinates as Coord[];
  if (g.type === "Polygon") return ((g as GeoJSON.Polygon).coordinates[0].slice(0, -1)) as Coord[];
  return [];
}

function centroid(coords: Coord[]): Coord {
  let x = 0, y = 0;
  for (const c of coords) { x += c[0]; y += c[1]; }
  return [x / coords.length, y / coords.length];
}

function toGeometry(coords: Coord[], f: FeatureData): GeoJSON.Geometry {
  if (f.type === "point" || f.type === "text") return { type: "Point", coordinates: coords[0] };
  if (f.type === "polygon") return { type: "Polygon", coordinates: [[...coords, coords[0]]] };
  return { type: "LineString", coordinates: coords };
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
  bbox?: BboxInfo,
): GeoJSON.FeatureCollection {
  const feats: GeoJSON.Feature[] = [];
  const isPoint = f.type === "point" || f.type === "text";
  const isPoly = f.type === "polygon";

  if (!isPoint) {
    for (let i = 0; i < coords.length; i++) {
      feats.push({ type: "Feature", geometry: { type: "Point", coordinates: coords[i] }, properties: { t: "v", index: i } });
    }
    const edges: [Coord, Coord][] = isPoly
      ? coords.map((c, i) => [c, coords[(i + 1) % coords.length]])
      : coords.slice(0, -1).map((c, i) => [c, coords[i + 1]]);
    for (let i = 0; i < edges.length; i++) {
      const [a, b] = edges[i];
      feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [(a[0]+b[0])/2, (a[1]+b[1])/2] }, properties: { t: "m", index: i } });
    }
    const line = isPoly ? [...coords, coords[0]] : coords;
    if (line.length >= 2) feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: line }, properties: { t: "e" } });
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

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

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
  const s = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
  if (s) s.setData(data);
}

type VertexDrag = { kind: "vertex"; idx: number; id: string; coords: Coord[]; feat: FeatureData };
type MoveDrag = { kind: "move"; id: string; coords: Coord[]; feat: FeatureData; startLng: number; startLat: number };
type RotateDrag = {
  kind: "rotate"; id: string;
  origCoords: Coord[]; coords: Coord[];
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
  updateFeature: (id: string, updates: Partial<FeatureData>) => void,
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
      if (!f || f.shapeOrigin) { setOverlay(map, EMPTY); return; }
      const isPoint = f.type === "point" || f.type === "text";
      if (isPoint) {
        const coords = getCoords(f);
        const bbox = pointRotateHandle(coords[0], map);
        setOverlay(map, buildFC(coords, f, bbox));
      } else {
        setOverlay(map, buildFC(getCoords(f), f));
      }
    }

    function onMouseDown(e: maplibregl.MapMouseEvent) {
      const f = featRef.current;
      if (!f || f.shapeOrigin) return;

      const rotateHits = map.getLayer(LAYER_ROTATE_HIT)
        ? map.queryRenderedFeatures(e.point, { layers: [LAYER_ROTATE_HIT] })
        : [];
      if (rotateHits.length > 0) {
        recordRef.current?.();
        e.preventDefault();
        interactingRef.current = true;
        map.dragPan.disable();
        map.getCanvas().style.cursor = "grabbing";
        const coords = getCoords(f);
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
        e.preventDefault();
        interactingRef.current = true;
        map.dragPan.disable();
        map.getCanvas().style.cursor = "grabbing";
        dragRef.current = {
          kind: "move", id: f.id, coords: [...getCoords(f)], feat: f,
          startLng: e.lngLat.lng, startLat: e.lngLat.lat,
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
        e.preventDefault();
        interactingRef.current = true;
        map.dragPan.disable();
        dragRef.current = { kind: "vertex", idx, id: f.id, coords: [...getCoords(f)], feat: f };
        map.getCanvas().style.cursor = "grabbing";
        return;
      }

      if (!map.getLayer(LAYER_MID)) return;
      const mHits = map.queryRenderedFeatures(e.point, { layers: [LAYER_MID] });
      if (mHits.length > 0) {
        const idx = mHits[0].properties?.index;
        if (typeof idx !== "number") return;
        recordRef.current?.();
        e.preventDefault();
        interactingRef.current = true;
        map.dragPan.disable();
        const coords = [...getCoords(f)];
        coords.splice(idx + 1, 0, [e.lngLat.lng, e.lngLat.lat]);
        dragRef.current = { kind: "vertex", idx: idx + 1, id: f.id, coords, feat: f };
        map.getCanvas().style.cursor = "grabbing";
      }
    }

    function onMouseMove(e: maplibregl.MapMouseEvent) {
      const d = dragRef.current;
      if (d) {
        if (d.kind === "vertex") {
          d.coords[d.idx] = [e.lngLat.lng, e.lngLat.lat];
          setOverlay(map, buildFC(d.coords, d.feat));
        } else if (d.kind === "move") {
          const dlng = e.lngLat.lng - d.startLng;
          const dlat = e.lngLat.lat - d.startLat;
          for (let i = 0; i < d.coords.length; i++) {
            d.coords[i] = [d.coords[i][0] + dlng, d.coords[i][1] + dlat];
          }
          d.startLng = e.lngLat.lng;
          d.startLat = e.lngLat.lat;
          setOverlay(map, buildFC(d.coords, d.feat));
        } else if (d.kind === "rotate") {
          const angle = Math.atan2(
            toMercatorY(e.lngLat.lat) - toMercatorY(d.center[1]),
            e.lngLat.lng - d.center[0]
          );
          const delta = angle - d.startAngle;
          const rotated = rotateCoords(d.origCoords, d.center, delta);
          for (let i = 0; i < d.coords.length; i++) d.coords[i] = rotated[i];
          const rotatedBbox = rotateBbox(d.origBbox, delta);
          setOverlay(map, buildFC(d.coords, d.feat, rotatedBbox));
        } else if (d.kind === "point-rotate") {
          const angle = Math.atan2(
            toMercatorY(e.lngLat.lat) - toMercatorY(d.center[1]),
            e.lngLat.lng - d.center[0]
          );
          const delta = angle - d.startAngle;
          d.currentRotation = d.baseRotation - (delta * 180) / Math.PI;
          const rotatedBbox = rotateBbox(d.origBbox, delta);
          setOverlay(map, buildFC([d.center], d.feat, rotatedBbox));
          updateRef.current(d.id, { rotation: d.currentRotation });
        }
        return;
      }
      const f = featRef.current;
      if (!f || f.shapeOrigin) return;
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
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";
      setTimeout(() => { interactingRef.current = false; }, 0);
      if (d.kind === "point-rotate") {
        updateRef.current(d.id, { rotation: d.currentRotation });
      } else {
        updateRef.current(d.id, { geometry: toGeometry(d.coords, d.feat) });
      }
    }

    const setup = () => {
      refresh();
      map.on("mousedown", onMouseDown);
      map.on("mousemove", onMouseMove);
      map.on("mouseup", onMouseUp);
    };

    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.once("load", setup);
    }

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
      if (!map.isStyleLoaded()) {
        map.once("idle", update);
        return;
      }
      ensureLayers(map);
      const f = featRef.current;
      if (!f || f.shapeOrigin) { setOverlay(map, EMPTY); return; }
      const isPoint = f.type === "point" || f.type === "text";
      if (isPoint) {
        const coords = getCoords(f);
        const bbox = pointRotateHandle(coords[0], map);
        setOverlay(map, buildFC(coords, f, bbox));
      } else {
        setOverlay(map, buildFC(getCoords(f), f));
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
