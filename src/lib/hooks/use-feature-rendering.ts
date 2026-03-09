"use client";

import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureData, LayerData } from "@/lib/types";

const FEATURES_SOURCE = "map-features";

export function useFeatureRendering(
  mapRef: React.RefObject<maplibregl.Map | null>,
  features: FeatureData[],
  layers: LayerData[]
) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setup = () => {
      if (map.getSource(FEATURES_SOURCE)) return;

      map.addSource(FEATURES_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "features-fill",
        type: "fill",
        source: FEATURES_SOURCE,
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["get", "opacity"],
        },
        filter: ["==", "$type", "Polygon"],
      });

      map.addLayer({
        id: "features-outline",
        type: "line",
        source: FEATURES_SOURCE,
        paint: { "line-color": ["get", "color"], "line-width": 2 },
        filter: ["==", "$type", "Polygon"],
      });

      map.addLayer({
        id: "features-line",
        type: "line",
        source: FEATURES_SOURCE,
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-opacity": ["get", "opacity"],
        },
        filter: ["==", "$type", "LineString"],
      });

      map.addLayer({
        id: "features-circle",
        type: "circle",
        source: FEATURES_SOURCE,
        paint: {
          "circle-radius": 8,
          "circle-color": ["get", "color"],
          "circle-opacity": ["get", "opacity"],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
        filter: ["==", "$type", "Point"],
      });

      map.addLayer({
        id: "features-labels",
        type: "symbol",
        source: FEATURES_SOURCE,
        layout: {
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1a1a1a",
          "text-halo-color": "#fff",
          "text-halo-width": 1,
        },
      });
    };

    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.on("load", setup);
    }
  }, [mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const visibleLayerIds = new Set(
      layers.filter((l) => l.visible).map((l) => l.id)
    );

    const geojsonFeatures: GeoJSON.Feature[] = features
      .filter((f) => visibleLayerIds.has(f.layerId))
      .map((f) => ({
        type: "Feature" as const,
        geometry: JSON.parse(f.geometry),
        properties: {
          id: f.id,
          label: f.label,
          color: f.color,
          opacity: f.opacity,
          featureType: f.type,
          layerId: f.layerId,
        },
      }));

    const source = map.getSource(FEATURES_SOURCE) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({ type: "FeatureCollection", features: geojsonFeatures });
    }
  }, [mapRef, features, layers]);
}

export { FEATURES_SOURCE };
