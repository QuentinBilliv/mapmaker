"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureData } from "@/lib/types";

const SRC = "vertex-edit";
const LAYER_VERTEX = "vertex-edit-points";
const LAYER_MID = "vertex-edit-midpoints";
const LAYER_EDGE = "vertex-edit-edges";

type Coord = [number, number];

function getCoords(f: FeatureData): Coord[] {
  const g = JSON.parse(f.geometry);
  if (g.type === "LineString") return g.coordinates;
  if (g.type === "Polygon") return g.coordinates[0].slice(0, -1);
  return [];
}

function toGeometryStr(coords: Coord[], isPoly: boolean): string {
  return isPoly
    ? JSON.stringify({ type: "Polygon", coordinates: [[...coords, coords[0]]] })
    : JSON.stringify({ type: "LineString", coordinates: coords });
}

function buildFC(coords: Coord[], isPoly: boolean): GeoJSON.FeatureCollection {
  const feats: GeoJSON.Feature[] = [];
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
  return { type: "FeatureCollection", features: feats };
}

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function ensureLayers(map: maplibregl.Map) {
  if (!map.getSource(SRC)) map.addSource(SRC, { type: "geojson", data: EMPTY });
  if (!map.getLayer(LAYER_EDGE)) {
    map.addLayer({ id: LAYER_EDGE, type: "line", source: SRC, paint: { "line-color": "#3b82f6", "line-width": 2, "line-dasharray": [3, 2] }, filter: ["==", ["get", "t"], "e"] });
  }
  if (!map.getLayer(LAYER_MID)) {
    map.addLayer({ id: LAYER_MID, type: "circle", source: SRC, paint: { "circle-radius": 4, "circle-color": "#fff", "circle-stroke-color": "#3b82f6", "circle-stroke-width": 2, "circle-opacity": 0.7 }, filter: ["==", ["get", "t"], "m"] });
  }
  if (!map.getLayer(LAYER_VERTEX)) {
    map.addLayer({ id: LAYER_VERTEX, type: "circle", source: SRC, paint: { "circle-radius": 6, "circle-color": "#3b82f6", "circle-stroke-color": "#fff", "circle-stroke-width": 2 }, filter: ["==", ["get", "t"], "v"] });
  }
  if (map.getLayer(LAYER_EDGE)) map.moveLayer(LAYER_EDGE);
  if (map.getLayer(LAYER_MID)) map.moveLayer(LAYER_MID);
  if (map.getLayer(LAYER_VERTEX)) map.moveLayer(LAYER_VERTEX);
}

function setOverlay(map: maplibregl.Map, data: GeoJSON.FeatureCollection) {
  const s = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
  if (s) s.setData(data);
}

export function useVertexEditing(
  mapRef: React.RefObject<maplibregl.Map | null>,
  selectedFeature: FeatureData | null,
  updateFeature: (id: string, updates: Partial<FeatureData>) => void
): React.RefObject<boolean> {
  const interactingRef = useRef(false);
  const dragRef = useRef<{ idx: number; id: string; coords: Coord[]; poly: boolean } | null>(null);
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
      if (!f || f.type === "point") { setOverlay(map, EMPTY); return; }
      setOverlay(map, buildFC(getCoords(f), f.type === "polygon"));
    }

    function onMouseDown(e: maplibregl.MapMouseEvent) {
      const f = featRef.current;
      if (!f || f.type === "point") return;
      if (!map.getLayer(LAYER_VERTEX)) return;

      const vHits = map.queryRenderedFeatures(e.point, { layers: [LAYER_VERTEX] });
      if (vHits.length > 0) {
        const idx = vHits[0].properties?.index;
        if (typeof idx !== "number") return;
        e.preventDefault();
        interactingRef.current = true;
        map.dragPan.disable();
        dragRef.current = { idx, id: f.id, coords: [...getCoords(f)], poly: f.type === "polygon" };
        map.getCanvas().style.cursor = "grabbing";
        return;
      }

      if (!map.getLayer(LAYER_MID)) return;
      const mHits = map.queryRenderedFeatures(e.point, { layers: [LAYER_MID] });
      if (mHits.length > 0) {
        const idx = mHits[0].properties?.index;
        if (typeof idx !== "number") return;
        e.preventDefault();
        interactingRef.current = true;
        map.dragPan.disable();
        const coords = [...getCoords(f)];
        coords.splice(idx + 1, 0, [e.lngLat.lng, e.lngLat.lat]);
        dragRef.current = { idx: idx + 1, id: f.id, coords, poly: f.type === "polygon" };
        map.getCanvas().style.cursor = "grabbing";
      }
    }

    function onMouseMove(e: maplibregl.MapMouseEvent) {
      const d = dragRef.current;
      if (d) {
        d.coords[d.idx] = [e.lngLat.lng, e.lngLat.lat];
        setOverlay(map, buildFC(d.coords, d.poly));
        return;
      }
      const f = featRef.current;
      if (!f || f.type === "point" || !map.getLayer(LAYER_VERTEX)) return;
      const hits = map.queryRenderedFeatures(e.point, { layers: [LAYER_VERTEX, LAYER_MID] });
      map.getCanvas().style.cursor = hits.length > 0 ? "grab" : "";
    }

    function onMouseUp() {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";
      setTimeout(() => { interactingRef.current = false; }, 0);
      updateRef.current(d.id, { geometry: toGeometryStr(d.coords, d.poly) });
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
      if (!f || f.type === "point") { setOverlay(map, EMPTY); return; }
      setOverlay(map, buildFC(getCoords(f), f.type === "polygon"));
    };

    update();

    return () => {
      cancelled = true;
      map.off("idle", update);
    };
  }, [mapRef, selectedId, selectedGeometry]);

  return interactingRef;
}
