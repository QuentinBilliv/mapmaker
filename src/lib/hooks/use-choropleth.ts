"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { ChoroplethData } from "@/lib/types";
import type { DrawMode } from "@/lib/draw-engine";
import { getTileLayerConfig } from "@/lib/choropleth";
import { CHOROPLETH_FILL, CHOROPLETH_HIT, ZF } from "./use-feature-rendering";
import { useChoroplethDisplay } from "./use-choropleth-display";

export function useChoropleth(
  mapRef: React.RefObject<maplibregl.Map | null>,
  choropleth: ChoroplethData,
  styleVersion: number,
  assignCountry: (iso: string, name: string) => void,
  unassignCountry: (iso: string) => void,
  choroplethMode: boolean,
  drawMode: DrawMode,
  enterChoroplethMode: () => void,
): void {
  useChoroplethDisplay(mapRef, choropleth, styleVersion);
  const choroplethRef = useRef(choropleth);
  useEffect(() => { choroplethRef.current = choropleth; }, [choropleth]);
  const choroplethModeRef = useRef(choroplethMode);
  useEffect(() => { choroplethModeRef.current = choroplethMode; }, [choroplethMode]);
  const drawModeRef = useRef(drawMode);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

  const handleClick = useCallback((e: maplibregl.MapMouseEvent) => {
    const map = mapRef.current;
    const choro = choroplethRef.current;
    if (!map || !choro.enabled) return;
    const inMode = choroplethModeRef.current;
    if (!inMode && drawModeRef.current !== "select") return;

    const featureLayers = (map.getStyle().layers ?? [])
      .filter((l) => l.id.startsWith(ZF))
      .map((l) => l.id);
    if (featureLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: featureLayers }).length > 0) return;

    const config = getTileLayerConfig(choro.tileLayer);
    const features = map.queryRenderedFeatures(e.point, { layers: [CHOROPLETH_FILL, CHOROPLETH_HIT] });
    if (!features.length) return;
    const f = features[0];
    const id = f.properties?.[config.idProp] as string;
    const name = f.properties?.[config.nameProp] as string;
    if (!id || !name) return;

    if (!inMode) {
      const hasAssignment = choro.mode === "discrete"
        ? Boolean(choro.assignments[id])
        : choro.values[id] !== undefined;
      if (!hasAssignment) return;
      e.preventDefault();
      enterChoroplethMode();
      const eventName = choro.mode === "discrete" ? "idomaps:choropleth-edit-region" : "idomaps:country-clicked";
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(eventName, { detail: { iso: id, name } }));
      }, 0);
      return;
    }

    e.preventDefault();
    if (choro.mode === "gradient") {
      window.dispatchEvent(new CustomEvent("idomaps:country-clicked", { detail: { iso: id, name } }));
      return;
    }
    if (!choro.activeCategoryId) {
      if (choro.assignments[id]) {
        window.dispatchEvent(new CustomEvent("idomaps:choropleth-edit-region", { detail: { iso: id, name } }));
      }
      return;
    }
    if (choro.assignments[id] === choro.activeCategoryId) {
      unassignCountry(id);
    } else {
      assignCountry(id, name);
    }
  }, [mapRef, assignCountry, unassignCountry, enterChoroplethMode]);

  useEffect(() => {
    if (!choropleth.enabled) return;
    const map = mapRef.current;
    if (!map) return;
    map.on("click", handleClick);
    return () => {
      try { map.off("click", handleClick); } catch (e) { console.warn("Failed to remove click handler:", e); }
    };
  }, [mapRef, handleClick, styleVersion, choropleth.enabled]);
}
