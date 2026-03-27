"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { useEditorData, useDrawingState, useEditorActions } from "@/lib/editor-context";
import { useMapInit } from "@/lib/hooks/use-map-init";
import { useDrawing } from "@/lib/hooks/use-drawing";
import { useFeatureRendering } from "@/lib/hooks/use-feature-rendering";
import { useVertexEditing } from "@/lib/hooks/use-vertex-editing";
import { useShapeEditing } from "@/lib/hooks/use-shape-editing";
import { useGroupEditing } from "@/lib/hooks/use-group-editing";
import { useFeatureTooltip } from "@/lib/hooks/use-feature-tooltip";
import { useLegendHighlight } from "@/lib/hooks/use-legend-highlight";

export default function MapCanvas() {
  const { map, features, layers, groups, legendEntries, selectedFeatureIds, selectedFeature } = useEditorData();
  const { drawMode, activeBaseMap } = useDrawingState();
  const { addFeature, selectFeature, selectFeatures, updateFeature, updateMap, registerDrawingControls, recordSnapshot, moveGroup, rotateGroup } = useEditorActions();

  const containerRef = useRef<HTMLDivElement>(null);
  const { mapRef, styleVersion } = useMapInit(containerRef, map.center, map.zoom, activeBaseMap);

  const selectedFeatureIdsRef = useRef(selectedFeatureIds);
  selectedFeatureIdsRef.current = selectedFeatureIds;
  const featuresRef = useRef(features);
  featuresRef.current = features;

  const onFeatureClick = useCallback(
    (id: string, shiftKey: boolean) => {
      if (shiftKey) {
        const current = selectedFeatureIdsRef.current;
        if (current.includes(id)) {
          selectFeatures(current.filter((fid) => fid !== id));
        } else {
          selectFeatures([...current, id]);
        }
        return;
      }
      const f = featuresRef.current.find((feat) => feat.id === id);
      if (f?.groupId) {
        const groupMembers = featuresRef.current.filter((feat) => feat.groupId === f.groupId).map((feat) => feat.id);
        selectFeatures(groupMembers);
      } else {
        selectFeature(id);
      }
    },
    [selectFeature, selectFeatures]
  );

  useFeatureRendering(mapRef, features, layers, groups, styleVersion, legendEntries);

  const selectedGroupId = useMemo(() => {
    if (drawMode !== "select" || selectedFeatureIds.length < 2) return null;
    const gid = features.find((f) => f.id === selectedFeatureIds[0])?.groupId;
    if (!gid) return null;
    const allMatch = selectedFeatureIds.every((id) => features.find((f) => f.id === id)?.groupId === gid);
    return allMatch ? gid : null;
  }, [drawMode, selectedFeatureIds, features]);

  const groupMembers = useMemo(() => {
    if (!selectedGroupId) return [];
    return features.filter((f) => f.groupId === selectedGroupId);
  }, [selectedGroupId, features]);

  const selectTarget = drawMode === "select" && !selectedGroupId ? selectedFeature : null;
  const vertexInteractingRef = useVertexEditing(mapRef, selectTarget, updateFeature, styleVersion, recordSnapshot, features, moveGroup, rotateGroup);
  const shapeInteractingRef = useShapeEditing(mapRef, selectTarget, updateFeature, styleVersion, recordSnapshot, features, moveGroup, rotateGroup);
  const groupInteractingRef = useGroupEditing(mapRef, selectedGroupId, groupMembers, moveGroup, rotateGroup, recordSnapshot, styleVersion);
  const combinedRef = useMemo(() => ({
    get current() { return !!(vertexInteractingRef.current || shapeInteractingRef.current || groupInteractingRef.current); },
    set current(_v: boolean) {},
  }), [vertexInteractingRef, shapeInteractingRef, groupInteractingRef]);
  const controls = useDrawing(mapRef, drawMode, addFeature, onFeatureClick, combinedRef, styleVersion);
  useEffect(() => registerDrawingControls(controls), [controls, registerDrawingControls]);
  useMoveListener(mapRef, updateMap);
  useFlyToListener(mapRef);
  useProjectionListener(mapRef, styleVersion);
  useFeatureTooltip(mapRef, drawMode, styleVersion, selectedFeatureIds.length > 0);
  useLegendHighlight(mapRef, styleVersion);

  return <div ref={containerRef} className="w-full h-full bg-black" />;
}

function useFlyToListener(mapRef: React.RefObject<maplibregl.Map | null>) {
  useEffect(() => {
    const handler = (e: Event) => {
      const map = mapRef.current;
      if (!map) return;
      const { center, zoom } = (e as CustomEvent).detail;
      map.flyTo({ center, zoom, duration: 1500 });
    };
    window.addEventListener("mapmaker:flyto", handler);
    return () => window.removeEventListener("mapmaker:flyto", handler);
  }, [mapRef]);
}

function useProjectionListener(mapRef: React.RefObject<maplibregl.Map | null>, styleVersion: number) {
  const projectionRef = useRef<"mercator" | "globe">("mercator");

  useEffect(() => {
    const handler = (e: Event) => {
      const map = mapRef.current;
      if (!map) return;
      const { projection } = (e as CustomEvent).detail;
      projectionRef.current = projection;
      map.setProjection({ type: projection });
    };
    window.addEventListener("mapmaker:set-projection", handler);
    return () => window.removeEventListener("mapmaker:set-projection", handler);
  }, [mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || projectionRef.current === "mercator") return;
    map.setProjection({ type: projectionRef.current });
  }, [mapRef, styleVersion]);
}

function useMoveListener(
  mapRef: React.RefObject<maplibregl.Map | null>,
  updateMap: (updates: { center: [number, number]; zoom: number }) => void
) {
  const onMoveEnd = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    const c = m.getCenter();
    updateMap({ center: [c.lng, c.lat], zoom: m.getZoom() });
  }, [mapRef, updateMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setup = () => map.on("moveend", onMoveEnd);
    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.on("load", setup);
    }

    return () => {
      map.off("load", setup);
      map.off("moveend", onMoveEnd);
    };
  }, [mapRef, onMoveEnd]);
}
