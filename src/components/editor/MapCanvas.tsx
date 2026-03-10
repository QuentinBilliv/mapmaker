"use client";

import { useRef, useEffect, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { useEditor } from "@/lib/editor-context";
import { useMapInit } from "@/lib/hooks/use-map-init";
import { useDrawing } from "@/lib/hooks/use-drawing";
import { useFeatureRendering } from "@/lib/hooks/use-feature-rendering";

export default function MapCanvas() {
  const { map, features, layers, drawMode, addFeature, selectFeature, updateMap, registerDrawingControls } =
    useEditor();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useMapInit(containerRef, map.center, map.zoom);

  const onFeatureClick = useCallback(
    (id: string) => selectFeature(id),
    [selectFeature]
  );

  const controls = useDrawing(mapRef, drawMode, addFeature, onFeatureClick);
  useEffect(() => registerDrawingControls(controls), [controls, registerDrawingControls]);
  useFeatureRendering(mapRef, features, layers);
  useMoveListener(mapRef, updateMap);

  return <div ref={containerRef} className="w-full h-full" />;
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
      if (map.isStyleLoaded()) map.off("moveend", onMoveEnd);
    };
  }, [mapRef, onMoveEnd]);
}
