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
} from "@/lib/shape-icons";
import { ensurePatternImage } from "@/lib/fill-patterns";
import { parseGeometry } from "@/lib/geojson";
import { COLORS, DEFAULT_BORDER_WIDTH } from "@/lib/defaults";
import { smoothGeometry } from "@/lib/smooth-geometry";
import { FEATURES_SOURCE, ARROW_SOURCE } from "@/lib/map-style";

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
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W, H);
  ctx.lineTo(W / 2, H * 0.7);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  map.addImage(ARROW_ICON_ID, ctx.getImageData(0, 0, ARROW_SIZE, ARROW_SIZE), { sdf: true });
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
    .flatMap((f) => {
      const rawGeometry = parseGeometry(f.geometry);
      if (!rawGeometry) return [];

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
          iconId = ensureShapeIcon(map, shape, f.color, f.borderColor ?? COLORS.white, f.borderWidth ?? DEFAULT_BORDER_WIDTH);
        }
      }

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

      let patternId = "";
      if (f.type === "polygon") {
        const pattern = f.fillPattern ?? "none";
        patternId = ensurePatternImage(map, pattern, f.color, f.opacity);
      }

      return [{
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
          patternId,
          strokeWidth: f.strokeWidth ?? 3,
          lineStyle: f.lineStyle ?? "solid",
        },
      }];
    });

  return {
    geojson: { type: "FeatureCollection", features: geojsonFeatures },
    arrows: { type: "FeatureCollection", features: arrowFeatures },
    pendingSvgs,
  };
}

function updateSources(
  map: maplibregl.Map,
  features: FeatureData[],
  layers: LayerData[]
): Promise<string>[] {
  const source = map.getSource(FEATURES_SOURCE) as maplibregl.GeoJSONSource;
  const arrowSource = map.getSource(ARROW_SOURCE) as maplibregl.GeoJSONSource;
  if (!source) return [];

  ensureArrowIcon(map);

  const { geojson, arrows, pendingSvgs } = buildGeoJSON(map, features, layers);
  source.setData(geojson);
  if (arrowSource) arrowSource.setData(arrows);
  return pendingSvgs;
}

function applyUpdate(
  map: maplibregl.Map,
  features: FeatureData[],
  layers: LayerData[],
  cancelled: () => boolean
) {
  const pending = updateSources(map, features, layers);
  if (pending.length > 0) {
    Promise.all(pending).then(() => {
      if (cancelled()) return;
      updateSources(map, features, layers);
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

    const onReady = () => {
      if (dead || !map.isStyleLoaded() || !map.getSource(FEATURES_SOURCE)) return;
      applyUpdate(map, features, layers, isCancelled);
    };

    if (map.isStyleLoaded() && map.getSource(FEATURES_SOURCE)) {
      applyUpdate(map, features, layers, isCancelled);
    }

    map.on("styledata", onReady);
    map.on("sourcedata", onReady);

    return () => {
      dead = true;
      map.off("styledata", onReady);
      map.off("sourcedata", onReady);
    };
  }, [mapRef, features, layers]);
}
