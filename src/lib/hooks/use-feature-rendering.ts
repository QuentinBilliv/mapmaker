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
import { smoothGeometry } from "@/lib/smooth-geometry";

const FEATURES_SOURCE = "map-features";
const ARROW_SOURCE = "arrow-heads";
const ARROW_ICON_ID = "arrowhead";
const ARROW_SIZE = 48;

function ensureArrowIcon(map: maplibregl.Map) {
  if (map.hasImage(ARROW_ICON_ID)) return;
  const canvas = document.createElement("canvas");
  canvas.width = ARROW_SIZE;
  canvas.height = ARROW_SIZE;
  const ctx = canvas.getContext("2d")!;
  const H = ARROW_SIZE;
  const W = ARROW_SIZE;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W, H);
  ctx.lineTo(W / 2, H * 0.7);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  map.addImage(ARROW_ICON_ID, ctx.getImageData(0, 0, ARROW_SIZE, ARROW_SIZE), { sdf: true });
}

function ensureSourceAndLayers(map: maplibregl.Map) {
  if (map.getSource(FEATURES_SOURCE)) return;

  ensureArrowIcon(map);

  map.addSource(FEATURES_SOURCE, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addSource(ARROW_SOURCE, {
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

  const DASH_STYLES: { id: string; dash?: number[] }[] = [
    { id: "solid" },
    { id: "dotted", dash: [1, 2] },
    { id: "dash-short", dash: [2, 2] },
    { id: "dash-medium", dash: [4, 3] },
    { id: "dash-long", dash: [8, 4] },
  ];

  for (const style of DASH_STYLES) {
    map.addLayer({
      id: `features-outline-${style.id}`,
      type: "line",
      source: FEATURES_SOURCE,
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["get", "strokeWidth"],
        ...(style.dash ? { "line-dasharray": style.dash } : {}),
      },
      filter: ["all", ["==", "$type", "Polygon"], ["==", "lineStyle", style.id]],
    });

    map.addLayer({
      id: `features-line-${style.id}`,
      type: "line",
      source: FEATURES_SOURCE,
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["get", "strokeWidth"],
        "line-opacity": ["get", "opacity"],
        ...(style.dash ? { "line-dasharray": style.dash } : {}),
      },
      filter: ["all", ["==", "$type", "LineString"], ["==", "lineStyle", style.id]],
    });
  }

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
    id: "features-arrows",
    type: "symbol",
    source: ARROW_SOURCE,
    layout: {
      "icon-image": ARROW_ICON_ID,
      "icon-size": ["*", ["get", "strokeWidth"], 0.15],
      "icon-rotate": ["get", "bearing"],
      "icon-allow-overlap": true,
      "icon-rotation-alignment": "map",
    },
    paint: {
      "icon-color": ["get", "color"],
      "icon-opacity": ["get", "opacity"],
    },
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

function bearing(a: number[], b: number[]): number {
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

interface BuildResult {
  geojson: GeoJSON.FeatureCollection;
  arrows: GeoJSON.FeatureCollection;
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
  const arrowFeatures: GeoJSON.Feature[] = [];

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

      const rawGeometry = JSON.parse(f.geometry);
      const displayGeometry =
        f.type !== "point" && f.smoothing > 0
          ? smoothGeometry(rawGeometry, f.smoothing)
          : rawGeometry;

      if (f.type === "polyline" && f.arrowStyle && f.arrowStyle !== "none" && displayGeometry.type === "LineString") {
        const coords: number[][] = displayGeometry.coordinates;
        if (coords.length >= 2) {
          if (f.arrowStyle === "forward" || f.arrowStyle === "both") {
            const a = coords[coords.length - 2];
            const b = coords[coords.length - 1];
            arrowFeatures.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: b },
              properties: { bearing: bearing(a, b), color: f.color, opacity: f.opacity, strokeWidth: f.strokeWidth ?? 3 },
            });
          }
          if (f.arrowStyle === "both") {
            const a = coords[1];
            const b = coords[0];
            arrowFeatures.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: b },
              properties: { bearing: bearing(a, b), color: f.color, opacity: f.opacity, strokeWidth: f.strokeWidth ?? 3 },
            });
          }
        }
      }

      return {
        type: "Feature" as const,
        geometry: displayGeometry,
        properties: {
          id: f.id,
          label: f.label,
          color: f.color,
          opacity: f.opacity,
          size: f.size ?? 1,
          featureType: f.type,
          layerId: f.layerId,
          iconId,
          strokeWidth: f.strokeWidth ?? 3,
          lineStyle: f.lineStyle ?? "solid",
        },
      };
    });

  return {
    geojson: { type: "FeatureCollection", features: geojsonFeatures },
    arrows: { type: "FeatureCollection", features: arrowFeatures },
    pendingSvgs,
  };
}

function setSourceData(
  map: maplibregl.Map,
  features: FeatureData[],
  layers: LayerData[]
): Promise<string>[] {
  const source = map.getSource(FEATURES_SOURCE) as maplibregl.GeoJSONSource;
  const arrowSource = map.getSource(ARROW_SOURCE) as maplibregl.GeoJSONSource;
  if (!source) return [];
  const { geojson, arrows, pendingSvgs } = buildGeoJSON(map, features, layers);
  source.setData(geojson);
  if (arrowSource) arrowSource.setData(arrows);
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
