"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { ChoroplethData } from "@/lib/types";
import { findRegionAtPoint, getTileLayerConfig } from "@/lib/choropleth";
import { useChoroplethDisplay } from "./use-choropleth-display";

export function useChoropleth(
  mapRef: React.RefObject<maplibregl.Map | null>,
  choropleth: ChoroplethData,
  styleVersion: number,
  assignCountry: (iso: string, name: string) => void,
  unassignCountry: (iso: string) => void,
  drawMode: string,
): React.RefObject<boolean> {
  const countriesRef = useChoroplethDisplay(mapRef, choropleth, styleVersion);
  const interactingRef = useRef(false);
  const choroplethRef = useRef(choropleth);
  choroplethRef.current = choropleth;
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  const handleClick = useCallback((e: maplibregl.MapMouseEvent) => {
    const choro = choroplethRef.current;
    if (!choro.enabled || drawModeRef.current !== "select") return;
    const regions = countriesRef.current;
    if (!regions) return;
    const config = getTileLayerConfig(choro.tileLayer);
    const region = findRegionAtPoint(regions, e.lngLat.lng, e.lngLat.lat, config);
    if (!region) return;
    e.preventDefault();
    interactingRef.current = true;
    requestAnimationFrame(() => { interactingRef.current = false; });
    if (choro.mode === "gradient") {
      window.dispatchEvent(new CustomEvent("mapmaker:country-clicked", { detail: { iso: region.id, name: region.name } }));
      return;
    }
    if (!choro.activeCategoryId) return;
    if (choro.assignments[region.id] === choro.activeCategoryId) {
      unassignCountry(region.id);
    } else {
      assignCountry(region.id, region.name);
    }
  }, [assignCountry, unassignCountry, countriesRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on("click", handleClick);
    return () => { try { map.off("click", handleClick); } catch {} };
  }, [mapRef, handleClick, styleVersion]);

  return interactingRef;
}
