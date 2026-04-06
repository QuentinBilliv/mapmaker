"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { ChoroplethData } from "@/lib/types";
import { getTileLayerConfig } from "@/lib/choropleth";
import { CHOROPLETH_FILL, CHOROPLETH_HIT } from "./use-feature-rendering";
import { useChoroplethDisplay } from "./use-choropleth-display";

export function useChoropleth(
  mapRef: React.RefObject<maplibregl.Map | null>,
  choropleth: ChoroplethData,
  styleVersion: number,
  assignCountry: (iso: string, name: string) => void,
  unassignCountry: (iso: string) => void,
  drawMode: string,
): React.RefObject<boolean> {
  useChoroplethDisplay(mapRef, choropleth, styleVersion);
  const interactingRef = useRef(false);
  const choroplethRef = useRef(choropleth);
  choroplethRef.current = choropleth;
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  const handleClick = useCallback((e: maplibregl.MapMouseEvent) => {
    const map = mapRef.current;
    const choro = choroplethRef.current;
    if (!map || !choro.enabled || drawModeRef.current !== "select") return;
    const config = getTileLayerConfig(choro.tileLayer);
    const features = map.queryRenderedFeatures(e.point, { layers: [CHOROPLETH_FILL, CHOROPLETH_HIT] });
    if (!features.length) return;
    const f = features[0];
    const id = f.properties?.[config.idProp] as string;
    const name = f.properties?.[config.nameProp] as string;
    if (!id || !name) return;
    e.preventDefault();
    interactingRef.current = true;
    requestAnimationFrame(() => { interactingRef.current = false; });
    if (choro.mode === "gradient") {
      window.dispatchEvent(new CustomEvent("mapmaker:country-clicked", { detail: { iso: id, name } }));
      return;
    }
    if (!choro.activeCategoryId) return;
    if (choro.assignments[id] === choro.activeCategoryId) {
      unassignCountry(id);
    } else {
      assignCountry(id, name);
    }
  }, [mapRef, assignCountry, unassignCountry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on("click", handleClick);
    return () => { try { map.off("click", handleClick); } catch {} };
  }, [mapRef, handleClick, styleVersion]);

  return interactingRef;
}
