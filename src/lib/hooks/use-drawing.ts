"use client";

import { useRef, useEffect, useCallback } from "react";
import maplibregl from "maplibre-gl";
import {
  DrawMode,
  DrawState,
  initDrawLayers,
  updateDrawPreview,
  buildGeometry,
  clearDrawPreview,
} from "@/lib/draw-engine";

interface DrawingControls {
  finishDrawing: () => void;
  cancelDrawing: () => void;
}

export function useDrawing(
  mapRef: React.RefObject<maplibregl.Map | null>,
  drawMode: DrawMode,
  onFeatureDrawn: (geometry: GeoJSON.Geometry) => void,
  onFeatureClick: (featureId: string) => void,
  vertexInteractingRef?: React.RefObject<boolean>
): DrawingControls {
  const drawStateRef = useRef<DrawState>({
    mode: "select",
    currentPoints: [],
    isDrawing: false,
  });
  const drawModeRef = useRef(drawMode);

  useEffect(() => {
    drawModeRef.current = drawMode;
    drawStateRef.current = {
      mode: drawMode,
      currentPoints: [],
      isDrawing: drawMode !== "select",
    };
    if (mapRef.current) {
      clearDrawPreview(mapRef.current);
      mapRef.current.getCanvas().style.cursor =
        drawMode === "select" ? "" : "crosshair";
    }
  }, [drawMode, mapRef]);

  const finishDrawing = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const mode = drawModeRef.current;
    if (mode === "select" || mode === "point") return;
    const state = drawStateRef.current;
    const geometry = buildGeometry(mode, state.currentPoints);
    if (geometry) onFeatureDrawn(geometry);
    state.currentPoints = [];
    clearDrawPreview(map);
  }, [mapRef, onFeatureDrawn]);

  const cancelDrawing = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      drawStateRef.current.currentPoints = [];
      clearDrawPreview(map);
    }
  }, [mapRef]);

  const handleClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (vertexInteractingRef?.current) return;
      const map = mapRef.current;
      if (!map) return;
      const mode = drawModeRef.current;

      if (mode === "select") {
        const queryLayers = [
          "features-fill",
          "features-line-solid", "features-line-dotted", "features-line-dash-short", "features-line-dash-medium", "features-line-dash-long",
          "features-circle",
        ].filter((id) => map.getLayer(id));
        const clicked = map.queryRenderedFeatures(e.point, { layers: queryLayers });
        if (clicked.length > 0 && clicked[0].properties?.id) {
          onFeatureClick(clicked[0].properties.id);
        }
        return;
      }

      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const state = drawStateRef.current;

      if (mode === "point") {
        const geometry = buildGeometry(mode, [point]);
        if (geometry) onFeatureDrawn(geometry);
        clearDrawPreview(map);
        return;
      }

      state.currentPoints.push(point);
      updateDrawPreview(map, state);
    },
    [mapRef, onFeatureDrawn, onFeatureClick]
  );

  const handleDblClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      finishDrawing();
    },
    [finishDrawing]
  );

  const handleMouseMove = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      const map = mapRef.current;
      if (!map) return;
      const state = drawStateRef.current;
      if (state.currentPoints.length > 0) {
        updateDrawPreview(map, state, [e.lngLat.lng, e.lngLat.lat]);
      }
    },
    [mapRef]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onLoad = () => {
      initDrawLayers(map);
      map.on("click", handleClick);
      map.on("dblclick", handleDblClick);
      map.on("mousemove", handleMouseMove);
    };

    if (map.isStyleLoaded()) {
      onLoad();
    } else {
      map.on("load", onLoad);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") finishDrawing();
      if (e.key === "Escape") cancelDrawing();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (map.isStyleLoaded()) {
        map.off("click", handleClick);
        map.off("dblclick", handleDblClick);
        map.off("mousemove", handleMouseMove);
      }
    };
  }, [mapRef, handleClick, handleDblClick, handleMouseMove, finishDrawing, cancelDrawing]);

  return { finishDrawing, cancelDrawing };
}
