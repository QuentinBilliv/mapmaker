"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { ChoroplethData } from "@/lib/types";
import { loadCountriesGeoJSON, buildChoroplethGeoJSONFromData, findCountryAtPoint } from "@/lib/choropleth";
import { CHOROPLETH_SOURCE, CHOROPLETH_FILL, CHOROPLETH_BORDER } from "./use-feature-rendering";

export function useChoropleth(
  mapRef: React.RefObject<maplibregl.Map | null>,
  choropleth: ChoroplethData,
  styleVersion: number,
  assignCountry: (iso: string, name: string) => void,
  unassignCountry: (iso: string) => void,
  drawMode: string,
): React.RefObject<boolean> {
  const countriesRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const interactingRef = useRef(false);
  const choroplethRef = useRef(choropleth);
  choroplethRef.current = choropleth;
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  useEffect(() => {
    if (!choropleth.enabled) return;
    let dead = false;
    loadCountriesGeoJSON().then((geojson) => {
      if (dead) return;
      countriesRef.current = geojson;
      const map = mapRef.current;
      if (!map) return;
      const source = map.getSource(CHOROPLETH_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(buildChoroplethGeoJSONFromData(geojson, choropleth));
    });
    return () => { dead = true; };
  }, [choropleth.enabled, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(CHOROPLETH_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    if (choropleth.enabled && countriesRef.current) {
      source.setData(buildChoroplethGeoJSONFromData(countriesRef.current, choropleth));
      if (map.getLayer(CHOROPLETH_FILL)) {
        map.setPaintProperty(CHOROPLETH_FILL, "fill-opacity", choropleth.opacity);
      }
      if (map.getLayer(CHOROPLETH_BORDER)) {
        map.setPaintProperty(CHOROPLETH_BORDER, "line-opacity", 0.4);
      }
    } else {
      source.setData({ type: "FeatureCollection", features: [] });
      if (map.getLayer(CHOROPLETH_BORDER)) {
        map.setPaintProperty(CHOROPLETH_BORDER, "line-opacity", 0);
      }
    }
  }, [mapRef, choropleth, styleVersion]);

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
  }, [assignCountry, unassignCountry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on("click", handleClick);
    return () => { try { map.off("click", handleClick); } catch {} };
  }, [mapRef, handleClick, styleVersion]);

  return interactingRef;
}
