"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureData, PolygonFeature, PolylineFeature, LayerData, GroupData, LegendEntry, PointShape } from "@/lib/types";
import { resolveAllFeatures } from "@/lib/resolve-style";
import {
  ensureShapeIcon,
  customSvgIconId,
  ensureCustomSvgIcon,
  ICON_SCALE,
} from "@/lib/shape-icons";
import { ensurePatternImage } from "@/lib/fill-patterns";
import { ensureAllDecorationIcons, decorationIconId } from "@/lib/line-decorations";
import type { LineDecoration } from "@/lib/types";
import { COLORS, DEFAULT_BORDER_WIDTH } from "@/lib/defaults";
import { smoothGeometry } from "@/lib/smooth-geometry";

const FEATURES_SOURCE = "map-features";
const ARROW_SOURCE = "arrow-heads";
const ARROW_ICON_ID = "arrowhead";
const ARROW_SIZE = 48;
const ZF = "zf-";
const FIRST_OVERLAY = "features-deco-crosses";

const DASH_MAP: Record<string, number[] | undefined> = {
  solid: undefined,
  dotted: [1, 2],
  "dash-short": [2, 2],
  "dash-medium": [4, 3],
  "dash-long": [8, 4],
};

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

interface DecoConf {
  id: Exclude<LineDecoration, "none">;
  offsetY: number;
}

const DECO_CONFIGS: DecoConf[] = [
  { id: "crosses",        offsetY: 0 },
  { id: "crosses-free",   offsetY: 0 },
  { id: "ticks",          offsetY: 0 },
  { id: "triangles-up",   offsetY: -10 },
  { id: "triangles-down", offsetY: 10 },
  { id: "arrows-up",      offsetY: -10 },
  { id: "arrows-down",    offsetY: 10 },
  { id: "railway",        offsetY: 0 },
];

const DECO_LAYER_IDS = DECO_CONFIGS.map((c) => `features-deco-${c.id}`);

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

  ensureAllDecorationIcons(map);

  for (const conf of DECO_CONFIGS) {
    map.addLayer({
      id: `features-deco-${conf.id}`,
      type: "symbol",
      source: FEATURES_SOURCE,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": conf.id === "railway" ? 15 : 50,
        "icon-image": decorationIconId(conf.id),
        "icon-size": [
          "interpolate", ["linear"], ["get", "strokeWidth"],
          1, 0.6,
          5, 1.2,
          10, 2.0,
        ],
        "icon-offset": ["literal", [0, conf.offsetY]],
        "icon-allow-overlap": true,
        "icon-rotation-alignment": "map",
        "icon-keep-upright": false,
        "symbol-sort-key": ["get", "order"],
      },
      paint: {
        "icon-color": ["get", "color"],
        "icon-opacity": 1,
      },
      filter: [
        "all",
        ["in", "$type", "LineString", "Polygon"],
        ["==", "lineDecoration", conf.id],
      ],
    });
  }

  map.addLayer({
    id: "features-railway-top",
    type: "line",
    source: FEATURES_SOURCE,
    layout: { "line-cap": "butt" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["*", ["get", "strokeWidth"], 0.4],
      "line-offset": ["*", ["get", "strokeWidth"], 1.2],
      "line-opacity": ["get", "opacity"],
    },
    filter: ["all", ["in", "$type", "LineString", "Polygon"], ["==", "lineDecoration", "railway"]],
  });

  map.addLayer({
    id: "features-railway-bottom",
    type: "line",
    source: FEATURES_SOURCE,
    layout: { "line-cap": "butt" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["*", ["get", "strokeWidth"], 0.4],
      "line-offset": ["*", ["get", "strokeWidth"], -1.2],
      "line-opacity": ["get", "opacity"],
    },
    filter: ["all", ["in", "$type", "LineString", "Polygon"], ["==", "lineDecoration", "railway"]],
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

}

function syncPerFeatureLayersSorted(
  map: maplibregl.Map,
  sorted: FeatureData[],
) {
  const style = map.getStyle();
  if (style?.layers) {
    for (const l of [...style.layers]) {
      if (l.id.startsWith(ZF)) map.removeLayer(l.id);
    }
  }

  const before = map.getLayer(FIRST_OVERLAY) ? FIRST_OVERLAY : undefined;

  for (const f of sorted) {
    const idFilter: maplibregl.ExpressionSpecification = ["==", ["get", "id"], f.id];

    switch (f.type) {
      case "polygon": {
        map.addLayer({
          id: `${ZF}${f.id}-fill`,
          type: "fill",
          source: FEATURES_SOURCE,
          paint: {
            "fill-pattern": ["get", "patternId"],
            "fill-opacity": 1,
          },
          filter: ["all", ["==", ["geometry-type"], "Polygon"], idFilter],
        }, before);
        const lineStyle = f.lineDecoration === "crosses-free" ? "__hidden" : f.lineStyle;
        if (lineStyle !== "__hidden") {
          const dash = DASH_MAP[lineStyle];
          map.addLayer({
            id: `${ZF}${f.id}-outline`,
            type: "line",
            source: FEATURES_SOURCE,
            paint: {
              "line-color": ["get", "color"],
              "line-width": ["get", "strokeWidth"],
              "line-opacity": 1,
              ...(dash ? { "line-dasharray": dash } : {}),
            },
            filter: ["all", ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["get", "_role"], "outline"]], idFilter],
          }, before);
        }
        break;
      }
      case "polyline": {
        const lineStyle = f.lineDecoration === "crosses-free" ? "__hidden" : f.lineStyle;
        if (lineStyle !== "__hidden") {
          const dash = DASH_MAP[lineStyle];
          map.addLayer({
            id: `${ZF}${f.id}-line`,
            type: "line",
            source: FEATURES_SOURCE,
            paint: {
              "line-color": ["get", "color"],
              "line-width": ["get", "strokeWidth"],
              "line-opacity": ["get", "opacity"],
              ...(dash ? { "line-dasharray": dash } : {}),
            },
            filter: ["all", ["==", ["geometry-type"], "LineString"], idFilter],
          }, before);
        }
        break;
      }
      case "point": {
        map.addLayer({
          id: `${ZF}${f.id}-point`,
          type: "symbol",
          source: FEATURES_SOURCE,
          layout: {
            "icon-image": ["get", "iconId"],
            "icon-size": [
              "interpolate", ["exponential", 1.5], ["zoom"],
              2, ["*", ["get", "size"], ICON_SCALE * 0.15],
              6, ["*", ["get", "size"], ICON_SCALE],
              14, ["*", ["get", "size"], ICON_SCALE * 6],
            ],
            "icon-allow-overlap": true,
            "icon-anchor": "center",
            "icon-rotate": ["get", "rotation"],
            "icon-rotation-alignment": "map",
          },
          paint: {
            "icon-opacity": ["get", "opacity"],
          },
          filter: ["all", ["==", ["geometry-type"], "Point"], ["!=", ["get", "featureType"], "text"], idFilter],
        }, before);
        break;
      }
      case "text": {
        const fontVariant = f.bold && f.italic
          ? "Open Sans Bold Italic"
          : f.bold ? "Open Sans Bold"
          : f.italic ? "Open Sans Italic"
          : "Open Sans Regular";
        map.addLayer({
          id: `${ZF}${f.id}-text`,
          type: "symbol",
          source: FEATURES_SOURCE,
          layout: {
            "text-field": ["get", "textContent"],
            "text-size": [
              "interpolate", ["linear"], ["zoom"],
              2, ["*", ["get", "fontSize"], 0.25],
              5, ["*", ["get", "fontSize"], 0.5],
              8, ["get", "fontSize"],
              12, ["*", ["get", "fontSize"], 1.5],
            ],
            "text-font": ["literal", [fontVariant, "Arial Unicode MS Regular"]],
            "text-allow-overlap": true,
            "text-anchor": "center",
            "text-max-width": 30,
            "text-rotate": ["get", "rotation"],
            "text-rotation-alignment": "map",
          },
          paint: {
            "text-color": ["get", "color"],
            "text-opacity": ["get", "opacity"],
            "text-halo-color": [
              "case",
              ["get", "textBorderEnabled"],
              ["get", "textBorderColor"],
              "rgba(0,0,0,0)",
            ],
            "text-halo-width": [
              "case",
              ["get", "textBorderEnabled"],
              ["get", "textBorderWidth"],
              0,
            ],
          },
          filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "featureType"], "text"], idFilter],
        }, before);
        break;
      }
    }
  }
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

function visibleSorted(features: FeatureData[], _layers: LayerData[], groups: GroupData[] = []): FeatureData[] {
  if (groups.length === 0) {
    return [...features].sort((a, b) => a.order - b.order);
  }

  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const grouped = new Map<string, FeatureData[]>();
  const standalone: FeatureData[] = [];

  for (const f of features) {
    if (f.groupId && groupMap.has(f.groupId)) {
      let arr = grouped.get(f.groupId);
      if (!arr) { arr = []; grouped.set(f.groupId, arr); }
      arr.push(f);
    } else {
      standalone.push(f);
    }
  }

  Array.from(grouped.values()).forEach((arr) => {
    arr.sort((a: FeatureData, b: FeatureData) => a.order - b.order);
  });

  type Item = { kind: "feature"; feature: FeatureData; order: number } | { kind: "group"; groupId: string; order: number };
  const items: Item[] = standalone.map((f) => ({ kind: "feature", feature: f, order: f.order }));
  Array.from(grouped.entries()).forEach(([gid]) => {
    const g = groupMap.get(gid)!;
    items.push({ kind: "group", groupId: gid, order: g.order });
  });
  items.sort((a, b) => a.order - b.order);

  const result: FeatureData[] = [];
  for (const item of items) {
    if (item.kind === "feature") {
      result.push(item.feature);
    } else {
      const members = grouped.get(item.groupId);
      if (members) result.push(...members);
    }
  }
  return result;
}

function buildGeoJSONSorted(
  map: maplibregl.Map,
  sorted: FeatureData[],
): BuildResult {
  const pendingSvgs: Promise<string>[] = [];
  const arrowFeatures: GeoJSON.Feature[] = [];

  const geojsonFeatures: GeoJSON.Feature[] = sorted
    .flatMap((f): GeoJSON.Feature[] => {
      const rawGeometry = f.geometry;

      if (f.type === "text") {
        return [{
          type: "Feature" as const,
          geometry: rawGeometry,
          properties: {
            id: f.id,
            label: "",
            description: f.description ?? "",
            color: f.color,
            opacity: f.opacity,
            order: f.order,
            featureType: "text",
            legendEntryId: f.legendEntryId ?? "",
            layerId: f.layerId,
            rotation: f.rotation ?? 0,
            textContent: f.textContent ?? "Text",
            fontSize: f.fontSize ?? 24,
            bold: f.bold ?? false,
            italic: f.italic ?? false,
            textBorderEnabled: f.textBorderEnabled ?? true,
            textBorderColor: f.textBorderColor ?? COLORS.white,
            textBorderWidth: f.textBorderWidth ?? 2,
          },
        }];
      }

      let iconId = "";

      if (f.type === "point") {
        if (f.customSvg) {
          iconId = customSvgIconId(f.customSvg, f.color);
          if (!map.hasImage(iconId)) {
            pendingSvgs.push(ensureCustomSvgIcon(map, f.customSvg, f.color));
          }
        } else {
          const shape: PointShape = f.shape ?? "circle";
          iconId = ensureShapeIcon(map, shape, f.color, f.borderColor ?? COLORS.white, f.borderWidth ?? DEFAULT_BORDER_WIDTH);
        }
      }

      const hasStroke = f.type === "polygon" || f.type === "polyline";

      const displayGeometry =
        hasStroke && f.smoothing > 0
          ? smoothGeometry(rawGeometry, f.smoothing)
          : rawGeometry;

      if (f.type === "polyline" && f.arrowStyle !== "none" && displayGeometry.type === "LineString") {
        const coords: number[][] = displayGeometry.coordinates;
        if (coords.length >= 2) {
          if (f.arrowStyle === "forward" || f.arrowStyle === "both") {
            const a = coords[coords.length - 2];
            const b = coords[coords.length - 1];
            arrowFeatures.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: b },
              properties: { bearing: bearing(a, b), color: f.color, opacity: f.opacity, strokeWidth: f.strokeWidth, legendEntryId: f.legendEntryId ?? "" },
            });
          }
          if (f.arrowStyle === "both") {
            const a = coords[1];
            const b = coords[0];
            arrowFeatures.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: b },
              properties: { bearing: bearing(a, b), color: f.color, opacity: f.opacity, strokeWidth: f.strokeWidth, legendEntryId: f.legendEntryId ?? "" },
            });
          }
        }
      }

      let patternId = "";
      if (f.type === "polygon") {
        patternId = ensurePatternImage(map, f.fillPattern, f.color, f.opacity);
      }

      const props = {
        id: f.id,
        label: f.label,
        description: f.description ?? "",
        color: f.color,
        opacity: f.opacity,
        order: f.order,
        size: f.type === "point" ? f.size : 1,
        rotation: f.rotation ?? 0,
        featureType: f.type,
        legendEntryId: f.legendEntryId ?? "",
        layerId: f.layerId,
        iconId,
        patternId,
        strokeWidth: hasStroke ? f.strokeWidth : 0,
        lineStyle: hasStroke ? (f.lineDecoration === "crosses-free" ? "__hidden" : f.lineStyle) : "solid",
        lineDecoration: hasStroke ? f.lineDecoration : "none",
      };

      if (f.type === "polygon" && displayGeometry.type === "MultiPolygon") {
        const outlineCoords = displayGeometry.coordinates.flatMap((poly) =>
          poly.map((ring) => ring as number[][])
        );
        return [
          { type: "Feature" as const, geometry: displayGeometry, properties: { ...props, _role: "fill" } },
          { type: "Feature" as const, geometry: { type: "MultiLineString" as const, coordinates: outlineCoords }, properties: { ...props, _role: "outline" } },
        ];
      }

      return [{ type: "Feature" as const, geometry: displayGeometry, properties: props }];
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
  layers: LayerData[],
  groups: GroupData[] = []
): Promise<string>[] {
  return setSourceDataSorted(map, visibleSorted(features, layers, groups));
}

function setSourceDataSorted(
  map: maplibregl.Map,
  sorted: FeatureData[],
): Promise<string>[] {
  const source = map.getSource(FEATURES_SOURCE) as maplibregl.GeoJSONSource;
  const arrowSource = map.getSource(ARROW_SOURCE) as maplibregl.GeoJSONSource;
  if (!source) return [];
  const { geojson, arrows, pendingSvgs } = buildGeoJSONSorted(map, sorted);
  source.setData(geojson);
  if (arrowSource) arrowSource.setData(arrows);
  return pendingSvgs;
}

function syncDecoSpacing(map: maplibregl.Map, features: FeatureData[]) {
  const decoFeature = features.find((f): f is PolygonFeature | PolylineFeature =>
    (f.type === "polygon" || f.type === "polyline") && f.lineDecoration !== "none"
  );
  if (!decoFeature) return;
  const spacing = decoFeature.decorationSpacing;
  for (const layerId of DECO_LAYER_IDS) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "symbol-spacing", spacing);
    }
  }
}

function fullUpdate(
  map: maplibregl.Map,
  features: FeatureData[],
  layers: LayerData[],
  groups: GroupData[],
  cancelled: () => boolean
) {
  ensureSourceAndLayers(map);
  const sorted = visibleSorted(features, layers, groups);
  const pending = setSourceDataSorted(map, sorted);
  syncPerFeatureLayersSorted(map, sorted);
  syncDecoSpacing(map, features);
  if (pending.length > 0) {
    Promise.all(pending).then(() => {
      if (cancelled()) return;
      setSourceData(map, features, layers, groups);
    });
  }
}

function structuralKey(sorted: FeatureData[]): string {
  let key = "";
  for (const f of sorted) {
    if (f.type === "polygon" || f.type === "polyline") {
      key += `${f.id}:${f.type[0]}:${f.lineStyle}:${f.lineDecoration};`;
    } else if (f.type === "text") {
      key += `${f.id}:t:${f.bold ? "b" : ""}${f.italic ? "i" : ""};`;
    } else {
      key += `${f.id}:${f.type[0]};`;
    }
  }
  return key;
}

export function useFeatureRendering(
  mapRef: React.RefObject<maplibregl.Map | null>,
  features: FeatureData[],
  layers: LayerData[],
  groups: GroupData[],
  styleVersion: number,
  legendEntries: LegendEntry[] = [],
) {
  const resolved = useMemo(() => resolveAllFeatures(features, legendEntries), [features, legendEntries]);
  const lastKeyRef = useRef("");

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let dead = false;
    const isCancelled = () => dead;

    if (map.getSource(FEATURES_SOURCE)) {
      const sorted = visibleSorted(resolved, layers, groups);
      const pending = setSourceDataSorted(map, sorted);
      const key = structuralKey(sorted);
      if (key !== lastKeyRef.current) {
        lastKeyRef.current = key;
        syncPerFeatureLayersSorted(map, sorted);
      }
      syncDecoSpacing(map, resolved);
      if (pending.length > 0) {
        Promise.all(pending).then(() => {
          if (dead) return;
          setSourceDataSorted(map, sorted);
        });
      }
    } else {
      const applyFeatures = () => {
        if (dead) return;
        lastKeyRef.current = structuralKey(visibleSorted(resolved, layers, groups));
        fullUpdate(map, resolved, layers, groups, isCancelled);
      };
      if (map.isStyleLoaded()) {
        applyFeatures();
      } else {
        map.once("idle", applyFeatures);
      }
    }

    return () => { dead = true; };
  }, [mapRef, resolved, layers, groups, styleVersion]);
}

export { FEATURES_SOURCE, ZF };
