"use client";

import { useEffect, useRef, useState } from "react";
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
  const [regions, setRegions] = useState<GeoJSON.FeatureCollection | null>(null);
  const tileLayerRef = useRef(choropleth.tileLayer);

  useEffect(() => {
    if (!choropleth.enabled) {
      setRegions(null);
      return;
    }
    tileLayerRef.current = choropleth.tileLayer;
    let dead = false;
    loadTileLayerGeoJSON(choropleth.tileLayer).then((geojson) => {
      if (dead) return;
      setRegions(geojson);
    }).catch((err) => {
      console.error("Failed to load tile layer:", err);
    });
    return () => { dead = true; };
  }, [choropleth.enabled, choropleth.tileLayer]);

  useEffect(() => {
    const map = mapRef.current;
    const src = map?.getSource(CHOROPLETH_SOURCE) as maplibregl.GeoJSONSource | undefined;
    const outlineSrc = map?.getSource(CHOROPLETH_OUTLINE_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!map || !src) return;
    if (choropleth.enabled && regions) {
      src.setData(buildChoroplethGeoJSONFromData(regions, choropleth));
      if (outlineSrc) outlineSrc.setData(regions);
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
  }, [mapRef, choropleth, regions, styleVersion]);
}
