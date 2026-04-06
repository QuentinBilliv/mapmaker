"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { ChoroplethData } from "@/lib/types";
import { loadTileLayerGeoJSON, buildChoroplethGeoJSONFromData } from "@/lib/choropleth";
import { CHOROPLETH_SOURCE, CHOROPLETH_OUTLINE_SOURCE, CHOROPLETH_FILL, CHOROPLETH_BORDER, CHOROPLETH_OUTLINE } from "./use-feature-rendering";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export function useChoroplethDisplay(
  mapRef: React.RefObject<maplibregl.Map | null>,
  choropleth: ChoroplethData,
  styleVersion: number,
): void {
  const regionsRef = useRef<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    if (!choropleth.enabled) return;
    let dead = false;
    loadTileLayerGeoJSON(choropleth.tileLayer).then((geojson) => {
      if (dead) return;
      regionsRef.current = geojson;
      const map = mapRef.current;
      if (!map) return;
      const outlineSrc = map.getSource(CHOROPLETH_OUTLINE_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (outlineSrc) outlineSrc.setData(geojson);
      const src = map.getSource(CHOROPLETH_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(buildChoroplethGeoJSONFromData(geojson, choropleth));
    }).catch((err) => {
      console.error("Failed to load tile layer:", err);
    });
    return () => { dead = true; };
  }, [choropleth.enabled, choropleth.tileLayer, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(CHOROPLETH_SOURCE) as maplibregl.GeoJSONSource | undefined;
    const outlineSrc = map.getSource(CHOROPLETH_OUTLINE_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    if (choropleth.enabled && regionsRef.current) {
      src.setData(buildChoroplethGeoJSONFromData(regionsRef.current, choropleth));
      if (outlineSrc) outlineSrc.setData(regionsRef.current);
      if (map.getLayer(CHOROPLETH_FILL)) {
        map.setPaintProperty(CHOROPLETH_FILL, "fill-opacity", choropleth.opacity);
      }
      if (map.getLayer(CHOROPLETH_BORDER)) {
        map.setPaintProperty(CHOROPLETH_BORDER, "line-opacity", 0.4);
      }
      if (map.getLayer(CHOROPLETH_OUTLINE)) {
        map.setPaintProperty(CHOROPLETH_OUTLINE, "line-opacity", 0.3);
      }
    } else {
      src.setData(EMPTY_FC);
      if (outlineSrc) outlineSrc.setData(EMPTY_FC);
      if (map.getLayer(CHOROPLETH_BORDER)) {
        map.setPaintProperty(CHOROPLETH_BORDER, "line-opacity", 0);
      }
      if (map.getLayer(CHOROPLETH_OUTLINE)) {
        map.setPaintProperty(CHOROPLETH_OUTLINE, "line-opacity", 0);
      }
    }
  }, [mapRef, choropleth, styleVersion]);

}
