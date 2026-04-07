"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { ChoroplethData } from "@/lib/types";
import { loadTileLayerGeoJSON, buildChoroplethGeoJSONFromData } from "@/lib/choropleth";
import { CHOROPLETH_SOURCE, CHOROPLETH_OUTLINE_SOURCE, CHOROPLETH_FILL, CHOROPLETH_BORDER, CHOROPLETH_OUTLINE, CHOROPLETH_BORDER_OPACITY, CHOROPLETH_OUTLINE_OPACITY } from "./use-feature-rendering";

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

  const applyToMap = useCallback((map: maplibregl.Map, data: GeoJSON.FeatureCollection | null, choro: ChoroplethData) => {
    const src = map.getSource(CHOROPLETH_SOURCE) as maplibregl.GeoJSONSource | undefined;
    const outlineSrc = map.getSource(CHOROPLETH_OUTLINE_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!src) return false;
    if (choro.enabled && data) {
      src.setData(buildChoroplethGeoJSONFromData(data, choro));
      if (outlineSrc) outlineSrc.setData(data);
      if (map.getLayer(CHOROPLETH_FILL)) {
        map.setPaintProperty(CHOROPLETH_FILL, "fill-opacity", choro.opacity);
      }
      if (map.getLayer(CHOROPLETH_BORDER)) {
        map.setPaintProperty(CHOROPLETH_BORDER, "line-opacity", CHOROPLETH_BORDER_OPACITY);
      }
      if (map.getLayer(CHOROPLETH_OUTLINE)) {
        map.setPaintProperty(CHOROPLETH_OUTLINE, "line-opacity", CHOROPLETH_OUTLINE_OPACITY);
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
    return true;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (applyToMap(map, regions, choropleth)) return;
    const onIdle = () => { applyToMap(map, regions, choropleth); };
    map.once("idle", onIdle);
    return () => { map.off("idle", onIdle); };
  }, [mapRef, choropleth, regions, styleVersion, applyToMap]);
}
