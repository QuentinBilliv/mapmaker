"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureData } from "@/lib/types";
import { COLORS } from "@/lib/defaults";
import { MOVE_ICON_ID, ensureMoveIcon } from "@/lib/move-icon";
import { ROTATE_ICON_ID, ensureRotateIcon } from "@/lib/rotate-icon";
import { type Coord, type BboxInfo, toMercatorY, computeBbox } from "@/lib/geo-math";
import { EMPTY_FC, setOverlayData, beginDrag, endDrag } from "./editing-helpers";

const SRC = "group-edit";
const LAYER_BBOX = "group-edit-bbox";
const LAYER_MOVE_HIT = "group-edit-move-hit";
const LAYER_MOVE_ICON = "group-edit-move-icon";
const LAYER_ROTATE_HIT = "group-edit-rotate-hit";
const LAYER_ROTATE_ICON = "group-edit-rotate-icon";
const LAYER_ROTATE_ARM = "group-edit-rotate-arm";

const EMPTY = EMPTY_FC;

function getAllCoords(members: FeatureData[]): Coord[] {
  const coords: Coord[] = [];
  for (const f of members) {
    const g = f.geometry;
    if (g.type === "Point") {
      coords.push(g.coordinates as Coord);
    } else if (g.type === "LineString") {
      for (const c of g.coordinates) coords.push(c as Coord);
    } else if (g.type === "Polygon") {
      for (const c of g.coordinates[0]) coords.push(c as Coord);
    }
  }
  return coords;
}

function buildGroupFC(bbox: BboxInfo): GeoJSON.FeatureCollection {
  const feats: GeoJSON.Feature[] = [];
  const bboxRing = [...bbox.corners, bbox.corners[0]];
  feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: bboxRing }, properties: { t: "bbox" } });
  feats.push({ type: "Feature", geometry: { type: "Point", coordinates: bbox.center }, properties: { t: "center" } });
  feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: [bbox.topCenter, bbox.handlePos] }, properties: { t: "rotate-arm" } });
  feats.push({ type: "Feature", geometry: { type: "Point", coordinates: bbox.handlePos }, properties: { t: "rotate" } });
  return { type: "FeatureCollection", features: feats };
}

function ensureLayers(map: maplibregl.Map) {
  if (!map.getSource(SRC)) map.addSource(SRC, { type: "geojson", data: EMPTY });
  ensureMoveIcon(map);
  ensureRotateIcon(map);
  if (!map.getLayer(LAYER_BBOX)) {
    map.addLayer({ id: LAYER_BBOX, type: "line", source: SRC, paint: { "line-color": COLORS.accent, "line-width": 1.5, "line-opacity": 0.5 }, filter: ["==", ["get", "t"], "bbox"] });
  }
  if (!map.getLayer(LAYER_ROTATE_ARM)) {
    map.addLayer({ id: LAYER_ROTATE_ARM, type: "line", source: SRC, paint: { "line-color": COLORS.accent, "line-width": 1, "line-opacity": 0.5 }, filter: ["==", ["get", "t"], "rotate-arm"] });
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
  if (map.getLayer(LAYER_ROTATE_ARM)) map.moveLayer(LAYER_ROTATE_ARM);
  if (map.getLayer(LAYER_MOVE_HIT)) map.moveLayer(LAYER_MOVE_HIT);
  if (map.getLayer(LAYER_MOVE_ICON)) map.moveLayer(LAYER_MOVE_ICON);
  if (map.getLayer(LAYER_ROTATE_HIT)) map.moveLayer(LAYER_ROTATE_HIT);
  if (map.getLayer(LAYER_ROTATE_ICON)) map.moveLayer(LAYER_ROTATE_ICON);
}

function setOverlay(map: maplibregl.Map, data: GeoJSON.FeatureCollection) {
  setOverlayData(map, SRC, data);
}

type MoveDrag = { kind: "move"; groupId: string; startLng: number; startMercY: number; origBbox: BboxInfo };
type RotateDrag = { kind: "rotate"; groupId: string; center: Coord; startAngle: number; lastAngle: number; origBbox: BboxInfo };
type DragState = MoveDrag | RotateDrag;

export function useGroupEditing(
  mapRef: React.RefObject<maplibregl.Map | null>,
  groupId: string | null,
  members: FeatureData[],
  moveGroup: (groupId: string, dlng: number, dlat: number) => void,
  rotateGroup: (groupId: string, deltaAngle: number, center: [number, number]) => void,
  recordSnapshot: () => void,
  styleVersion: number,
): React.RefObject<boolean> {
  const interactingRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const groupIdRef = useRef(groupId);
  groupIdRef.current = groupId;
  const membersRef = useRef(members);
  membersRef.current = members;
  const moveGroupRef = useRef(moveGroup);
  moveGroupRef.current = moveGroup;
  const rotateGroupRef = useRef(rotateGroup);
  rotateGroupRef.current = rotateGroup;
  const recordRef = useRef(recordSnapshot);
  recordRef.current = recordSnapshot;

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const map = m;

    function refresh() {
      if (!map.isStyleLoaded()) return;
      ensureLayers(map);
      const gid = groupIdRef.current;
      const mems = membersRef.current;
      if (!gid || mems.length === 0) { setOverlay(map, EMPTY); return; }
      const allCoords = getAllCoords(mems);
      if (allCoords.length < 2) { setOverlay(map, EMPTY); return; }
      const bbox = computeBbox(allCoords);
      setOverlay(map, buildGroupFC(bbox));
    }

    function onMouseDown(e: maplibregl.MapMouseEvent) {
      const gid = groupIdRef.current;
      const mems = membersRef.current;
      if (!gid || mems.length === 0) return;

      const allCoords = getAllCoords(mems);
      if (allCoords.length < 2) return;
      const bbox = computeBbox(allCoords);

      const rotateHits = map.getLayer(LAYER_ROTATE_HIT)
        ? map.queryRenderedFeatures(e.point, { layers: [LAYER_ROTATE_HIT] })
        : [];
      if (rotateHits.length > 0) {
        recordRef.current();
        beginDrag(map, e, interactingRef);
        const startAngle = Math.atan2(
          toMercatorY(e.lngLat.lat) - toMercatorY(bbox.center[1]),
          e.lngLat.lng - bbox.center[0]
        );
        dragRef.current = { kind: "rotate", groupId: gid, center: bbox.center, startAngle, lastAngle: startAngle, origBbox: bbox };
        return;
      }

      const moveHits = map.getLayer(LAYER_MOVE_HIT)
        ? map.queryRenderedFeatures(e.point, { layers: [LAYER_MOVE_HIT] })
        : [];
      if (moveHits.length > 0) {
        recordRef.current();
        beginDrag(map, e, interactingRef);
        dragRef.current = { kind: "move", groupId: gid, startLng: e.lngLat.lng, startMercY: toMercatorY(e.lngLat.lat), origBbox: bbox };
        return;
      }
    }

    function onMouseMove(e: maplibregl.MapMouseEvent) {
      const d = dragRef.current;
      if (d) {
        if (d.kind === "move") {
          const dlng = e.lngLat.lng - d.startLng;
          const curMercY = toMercatorY(e.lngLat.lat);
          const dMercY = curMercY - d.startMercY;
          moveGroupRef.current(d.groupId, dlng, dMercY);
          d.startLng = e.lngLat.lng;
          d.startMercY = curMercY;
          const mems = membersRef.current;
          const allCoords = getAllCoords(mems);
          if (allCoords.length >= 2) {
            setOverlay(map, buildGroupFC(computeBbox(allCoords)));
          }
        } else if (d.kind === "rotate") {
          const angle = Math.atan2(
            toMercatorY(e.lngLat.lat) - toMercatorY(d.center[1]),
            e.lngLat.lng - d.center[0]
          );
          const increment = angle - d.lastAngle;
          d.lastAngle = angle;
          if (Math.abs(increment) > 0.0001) {
            rotateGroupRef.current(d.groupId, increment, d.center as [number, number]);
          }
          const mems = membersRef.current;
          const allCoords = getAllCoords(mems);
          if (allCoords.length >= 2) {
            setOverlay(map, buildGroupFC(computeBbox(allCoords)));
          }
        }
        return;
      }
      const gid = groupIdRef.current;
      if (!gid) return;
      const rotateLayer = map.getLayer(LAYER_ROTATE_HIT) ? [LAYER_ROTATE_HIT] : [];
      const rotateHits = rotateLayer.length > 0 ? map.queryRenderedFeatures(e.point, { layers: rotateLayer }) : [];
      if (rotateHits.length > 0) {
        map.getCanvas().style.cursor = "crosshair";
        return;
      }
      const moveLayer = map.getLayer(LAYER_MOVE_HIT) ? [LAYER_MOVE_HIT] : [];
      const moveHits = moveLayer.length > 0 ? map.queryRenderedFeatures(e.point, { layers: moveLayer }) : [];
      map.getCanvas().style.cursor = moveHits.length > 0 ? "grab" : "";
    }

    function onMouseUp() {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      endDrag(map, interactingRef);
      const mems = membersRef.current;
      const allCoords = getAllCoords(mems);
      if (allCoords.length >= 2) {
        setOverlay(map, buildGroupFC(computeBbox(allCoords)));
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

  const membersJson = JSON.stringify(members.map((m) => m.id + ":" + JSON.stringify(m.geometry)));
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const update = () => {
      if (cancelled) return;
      if (!map.isStyleLoaded()) { map.once("idle", update); return; }
      ensureLayers(map);
      const gid = groupIdRef.current;
      const mems = membersRef.current;
      if (!gid || mems.length === 0) { setOverlay(map, EMPTY); return; }
      const allCoords = getAllCoords(mems);
      if (allCoords.length < 2) { setOverlay(map, EMPTY); return; }
      setOverlay(map, buildGroupFC(computeBbox(allCoords)));
    };

    update();
    return () => { cancelled = true; map.off("idle", update); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, groupId, membersJson, styleVersion]);

  return interactingRef;
}
