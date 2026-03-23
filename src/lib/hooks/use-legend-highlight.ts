"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { ZF } from "./use-feature-rendering";
import { useHighlight } from "@/lib/highlight-context";

const DIM_OPACITY = 0.15;
const ARROW_LAYER = "features-arrows";
const DECO_PREFIX = "features-deco-";

export function useLegendHighlight(
  mapRef: React.RefObject<maplibregl.Map | null>,
  styleVersion: number,
) {
  const { hoveredLegendEntryId } = useHighlight();
  const entryIdRef = useRef<string | null>(null);
  entryIdRef.current = hoveredLegendEntryId;

  const applyHighlight = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const entryId = entryIdRef.current;
    const allLayers = map.getStyle()?.layers ?? [];

    for (const layer of allLayers) {
      const isFeature = layer.id.startsWith(ZF);
      const isArrow = layer.id === ARROW_LAYER;
      const isDeco = layer.id.startsWith(DECO_PREFIX);
      if (!isFeature && !isArrow && !isDeco) continue;

      if (!entryId) {
        resetLayer(map, layer);
      } else {
        dimLayer(map, layer, entryId);
      }
    }
  }, [mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    applyHighlight();

    if (!hoveredLegendEntryId) return;

    const onRender = () => applyHighlight();
    map.on("render", onRender);
    return () => { map.off("render", onRender); };
  }, [mapRef, hoveredLegendEntryId, styleVersion, applyHighlight]);
}

function dimExpr(entryId: string, normal: maplibregl.ExpressionSpecification | number): maplibregl.ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "legendEntryId"], entryId],
    normal as maplibregl.ExpressionSpecification,
    DIM_OPACITY,
  ];
}

function dimLayer(map: maplibregl.Map, layer: maplibregl.LayerSpecification, entryId: string) {
  const lid = layer.id;
  const isFillOrOutline = lid.endsWith("-fill") || lid.endsWith("-outline");

  switch (layer.type) {
    case "fill":
      map.setPaintProperty(lid, "fill-opacity", dimExpr(entryId, 1));
      break;
    case "line":
      map.setPaintProperty(lid, "line-opacity", dimExpr(entryId, isFillOrOutline ? 1 : ["get", "opacity"]));
      break;
    case "symbol":
      if (lid.endsWith("-text")) {
        map.setPaintProperty(lid, "text-opacity", dimExpr(entryId, ["get", "opacity"]));
      } else {
        map.setPaintProperty(lid, "icon-opacity", dimExpr(entryId, ["get", "opacity"]));
      }
      break;
  }
}

function resetLayer(map: maplibregl.Map, layer: maplibregl.LayerSpecification) {
  const lid = layer.id;
  const isFillOrOutline = lid.endsWith("-fill") || lid.endsWith("-outline");

  switch (layer.type) {
    case "fill":
      map.setPaintProperty(lid, "fill-opacity", 1);
      break;
    case "line":
      map.setPaintProperty(lid, "line-opacity", isFillOrOutline ? 1 : ["get", "opacity"]);
      break;
    case "symbol":
      if (lid.endsWith("-text")) {
        map.setPaintProperty(lid, "text-opacity", ["get", "opacity"]);
      } else {
        map.setPaintProperty(lid, "icon-opacity", ["get", "opacity"]);
      }
      break;
  }
}
