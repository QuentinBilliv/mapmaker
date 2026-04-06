"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { ChoroplethData } from "@/lib/types";
import { findCountryAtPoint } from "@/lib/choropleth";
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
    const countries = countriesRef.current;
    if (!countries) return;
    const country = findCountryAtPoint(countries, e.lngLat.lng, e.lngLat.lat);
    if (!country) return;
    e.preventDefault();
    interactingRef.current = true;
    requestAnimationFrame(() => { interactingRef.current = false; });
    if (choro.mode === "gradient") {
      window.dispatchEvent(new CustomEvent("mapmaker:country-clicked", { detail: country }));
      return;
    }
    if (!choro.activeCategoryId) return;
    if (choro.assignments[country.iso] === choro.activeCategoryId) {
      unassignCountry(country.iso);
    } else {
      assignCountry(country.iso, country.name);
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
