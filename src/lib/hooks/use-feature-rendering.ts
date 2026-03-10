"use client";

import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureData, LayerData, PointShape } from "@/lib/types";
import {
  ensureShapeIcon,
  catalogIconId,
  ensureCatalogIcon,
  customSvgIconId,
  ensureCustomSvgIcon,
  ICON_SCALE,
} from "@/lib/shape-icons";

const FEATURES_SOURCE = "map-features";

function ensureSourceAndLayers(map: maplibregl.Map) {
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
    type: "symbol",
    source: FEATURES_SOURCE,
    layout: {
      "icon-image": ["get", "iconId"],
      "icon-size": ["*", ["get", "size"], ICON_SCALE],
      "icon-allow-overlap": true,
      "icon-anchor": "center",
    },
    paint: {
      "icon-opacity": ["get", "opacity"],
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
}

interface BuildResult {
  geojson: GeoJSON.FeatureCollection;
  pendingSvgs: Promise<string>[];
}

function buildGeoJSON(
  map: maplibregl.Map,
  features: FeatureData[],
  layers: LayerData[]
): BuildResult {
  const visibleLayerIds = new Set(
    layers.filter((l) => l.visible).map((l) => l.id)
  );

  const pendingSvgs: Promise<string>[] = [];

  const geojsonFeatures: GeoJSON.Feature[] = features
    .filter((f) => visibleLayerIds.has(f.layerId))
    .map((f) => {
      let iconId = "";

      if (f.type === "point") {
        if (f.customSvg) {
          iconId = customSvgIconId(f.customSvg, f.color);
          if (!map.hasImage(iconId)) {
            pendingSvgs.push(ensureCustomSvgIcon(map, f.customSvg, f.color));
          }
        } else if (f.icon) {
          iconId = catalogIconId(f.icon, f.color);
          if (!map.hasImage(iconId)) {
            pendingSvgs.push(ensureCatalogIcon(map, f.icon, f.color));
          }
        } else {
          const shape: PointShape = f.shape ?? "circle";
          iconId = ensureShapeIcon(map, shape, f.color);
        }
      }

      return {
        type: "Feature" as const,
        geometry: JSON.parse(f.geometry),
        properties: {
          id: f.id,
          label: f.label,
          color: f.color,
          opacity: f.opacity,
          size: f.size ?? 1,
          featureType: f.type,
          layerId: f.layerId,
          iconId,
        },
      };
    });

  return {
    geojson: { type: "FeatureCollection", features: geojsonFeatures },
    pendingSvgs,
  };
}

function setSourceData(
  map: maplibregl.Map,
  features: FeatureData[],
  layers: LayerData[]
): Promise<string>[] {
  const source = map.getSource(FEATURES_SOURCE) as maplibregl.GeoJSONSource;
  if (!source) return [];
  const { geojson, pendingSvgs } = buildGeoJSON(map, features, layers);
  source.setData(geojson);
  return pendingSvgs;
}

function fullUpdate(
  map: maplibregl.Map,
  features: FeatureData[],
  layers: LayerData[],
  cancelled: () => boolean
) {
  ensureSourceAndLayers(map);
  const pending = setSourceData(map, features, layers);
  if (pending.length > 0) {
    Promise.all(pending).then(() => {
      if (cancelled()) return;
      setSourceData(map, features, layers);
    });
  }
}

export function useFeatureRendering(
  mapRef: React.RefObject<maplibregl.Map | null>,
  features: FeatureData[],
  layers: LayerData[]
) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let dead = false;
    const isCancelled = () => dead;

    const applyFeatures = () => {
      if (dead) return;
      fullUpdate(map, features, layers, isCancelled);
    };

    if (map.getSource(FEATURES_SOURCE)) {
      const pending = setSourceData(map, features, layers);
      if (pending.length > 0) {
        Promise.all(pending).then(() => {
          if (dead) return;
          setSourceData(map, features, layers);
        });
      }
    } else if (map.isStyleLoaded()) {
      fullUpdate(map, features, layers, isCancelled);
    } else {
      map.once("load", applyFeatures);
    }

    map.on("styledata", applyFeatures);

    return () => {
      dead = true;
      map.off("styledata", applyFeatures);
    };
  }, [mapRef, features, layers]);
}

export { FEATURES_SOURCE };
