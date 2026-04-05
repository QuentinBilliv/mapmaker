"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { ChoroplethData } from "@/lib/types";
import { loadCountriesGeoJSON, buildChoroplethGeoJSON } from "@/lib/choropleth";
import { CHOROPLETH_SOURCE, CHOROPLETH_FILL, CHOROPLETH_BORDER } from "./use-feature-rendering";

export function useChoropleth(
  mapRef: React.RefObject<maplibregl.Map | null>,
  choropleth: ChoroplethData,
  styleVersion: number,
) {
  const countriesRef = useRef<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    if (!choropleth.enabled) return;
    let dead = false;
    loadCountriesGeoJSON().then((geojson) => {
      if (dead) return;
      countriesRef.current = geojson;
      const map = mapRef.current;
      if (!map) return;
      const source = map.getSource(CHOROPLETH_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(buildChoroplethGeoJSON(geojson, choropleth.entries));
      }
    });
    return () => { dead = true; };
  }, [choropleth.enabled, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(CHOROPLETH_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (choropleth.enabled && countriesRef.current) {
      source.setData(buildChoroplethGeoJSON(countriesRef.current, choropleth.entries));
      if (map.getLayer(CHOROPLETH_FILL)) {
        map.setPaintProperty(CHOROPLETH_FILL, "fill-opacity", ["*", ["get", "_painted"], choropleth.opacity]);
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
}
