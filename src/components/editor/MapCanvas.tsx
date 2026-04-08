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
import { useChoropleth } from "@/lib/hooks/use-choropleth";
import { computeFeaturesBounds } from "@/lib/geojson";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/defaults";

export default function MapCanvas() {
  const { map, features, groups, legendEntries, selectedFeatureIds, selectedFeature, choropleth, choroplethMode } = useEditorData();
  const { drawMode, activeBaseMap, styleOptions } = useDrawingState();
  const { addFeature, selectFeature, selectFeatures, updateFeature, updateMap, registerDrawingControls, recordSnapshot, moveGroup, rotateGroup, assignCountryToCategory, unassignCountry } = useEditorActions();

  const containerRef = useRef<HTMLDivElement>(null);
  const isDefaultView = map.center[0] === DEFAULT_CENTER[0] && map.center[1] === DEFAULT_CENTER[1] && map.zoom === DEFAULT_ZOOM;
  const initialBounds = useMemo(() => isDefaultView ? computeFeaturesBounds(features) : null, []);
  const { mapRef, styleVersion } = useMapInit(containerRef, map.center, map.zoom, activeBaseMap, initialBounds, styleOptions);

  const selectedFeatureIdsRef = useRef(selectedFeatureIds);
  selectedFeatureIdsRef.current = selectedFeatureIds;
  const featuresRef = useRef(features);
  featuresRef.current = features;
  const choroplethModeRef = useRef(choroplethMode);
  choroplethModeRef.current = choroplethMode;

  const onFeatureClick = useCallback(
    (id: string, shiftKey: boolean) => {
      if (choroplethModeRef.current) return;
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

  useFeatureRendering(mapRef, features, groups, styleVersion, legendEntries);
  const choroplethInteractingRef = useChoropleth(mapRef, choropleth, styleVersion, assignCountryToCategory, unassignCountry, drawMode);

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
    get current() { return !!(vertexInteractingRef.current || shapeInteractingRef.current || groupInteractingRef.current || choroplethInteractingRef.current); },
    set current(_v: boolean) {},
  }), [vertexInteractingRef, shapeInteractingRef, groupInteractingRef, choroplethInteractingRef]);
  const controls = useDrawing(mapRef, drawMode, addFeature, onFeatureClick, combinedRef, styleVersion);
  useEffect(() => registerDrawingControls(controls), [controls, registerDrawingControls]);
  useSaveViewListener(mapRef, updateMap);
  useFlyToListener(mapRef);
  useFitBoundsListener(mapRef);
  useProjectionListener(mapRef, styleVersion);
  useFeatureTooltip(mapRef, drawMode, styleVersion, selectedFeatureIds.length > 0);
  useLegendHighlight(mapRef, styleVersion, choropleth.opacity);

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

function useFitBoundsListener(mapRef: React.RefObject<maplibregl.Map | null>) {
  useEffect(() => {
    const handler = (e: Event) => {
      const map = mapRef.current;
      if (!map) return;
      const { bounds } = (e as CustomEvent).detail;
      map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 1500 });
    };
    window.addEventListener("mapmaker:fitbounds", handler);
    return () => window.removeEventListener("mapmaker:fitbounds", handler);
  }, [mapRef]);
}


function useSaveViewListener(
  mapRef: React.RefObject<maplibregl.Map | null>,
  updateMap: (updates: { center: [number, number]; zoom: number }) => void
) {
  useEffect(() => {
    const handler = () => {
      const m = mapRef.current;
      if (!m) return;
      const c = m.getCenter();
      updateMap({ center: [c.lng, c.lat], zoom: m.getZoom() });
    };
    window.addEventListener("mapmaker:save-view", handler);
    return () => window.removeEventListener("mapmaker:save-view", handler);
  }, [mapRef, updateMap]);
}
