"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { ZF, CHOROPLETH_FILL, CHOROPLETH_BORDER, CHOROPLETH_BORDER_OPACITY } from "./use-feature-rendering";
import { useHighlight } from "@/lib/highlight-context";

const DIM_OPACITY = 0.15;
const DECO_PREFIX = "features-deco-";

export function useLegendHighlight(
  mapRef: React.RefObject<maplibregl.Map | null>,
  styleVersion: number,
  choroplethOpacity?: number,
) {
  const { hoveredLegendEntryId } = useHighlight();
  const entryIdRef = useRef<string | null>(null);
  entryIdRef.current = hoveredLegendEntryId;
  const choroplethOpacityRef = useRef(choroplethOpacity ?? 0.7);
  choroplethOpacityRef.current = choroplethOpacity ?? 0.7;

  const applyHighlight = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const entryId = entryIdRef.current;
    const normalChoroplethOpacity = choroplethOpacityRef.current;
    const allLayers = map.getStyle()?.layers ?? [];

    for (const layer of allLayers) {
      const isFeature = layer.id.startsWith(ZF);
      const isDeco = layer.id.startsWith(DECO_PREFIX);
      const isChoroplethFill = layer.id === CHOROPLETH_FILL;
      const isChoroplethBorder = layer.id === CHOROPLETH_BORDER;

      if (isFeature || isDeco) {
        if (!entryId) {
          resetFeatureLayer(map, layer);
        } else {
          dimFeatureLayer(map, layer, entryId);
        }
      } else if (isChoroplethFill) {
        if (!entryId) {
          map.setPaintProperty(CHOROPLETH_FILL, "fill-opacity", normalChoroplethOpacity);
        } else {
          map.setPaintProperty(CHOROPLETH_FILL, "fill-opacity", choroplethDimExpr(entryId, normalChoroplethOpacity));
        }
      } else if (isChoroplethBorder) {
        if (!entryId) {
          map.setPaintProperty(CHOROPLETH_BORDER, "line-opacity", CHOROPLETH_BORDER_OPACITY);
        } else {
          map.setPaintProperty(CHOROPLETH_BORDER, "line-opacity", choroplethDimExpr(entryId, CHOROPLETH_BORDER_OPACITY));
        }
      }
    }
  }, [mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    applyHighlight();

    if (!hoveredLegendEntryId) return;

    const onStyleData = () => applyHighlight();
    map.on("styledata", onStyleData);
    return () => { map.off("styledata", onStyleData); };
  }, [mapRef, hoveredLegendEntryId, styleVersion, applyHighlight]);
}

function featureDimExpr(entryId: string, normal: maplibregl.ExpressionSpecification | number): maplibregl.ExpressionSpecification {
  return [
    "case",
    [
      "any",
      ["==", ["get", "legendEntryId"], entryId],
      ["==", ["get", "choroplethCategoryId"], entryId],
    ],
    normal as maplibregl.ExpressionSpecification,
    DIM_OPACITY,
  ];
}

function choroplethDimExpr(entryId: string, normal: number): maplibregl.ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "_categoryId"], entryId],
    normal,
    DIM_OPACITY,
  ];
}

function dimFeatureLayer(map: maplibregl.Map, layer: maplibregl.LayerSpecification, entryId: string) {
  const lid = layer.id;
  const isFillOrOutline = lid.endsWith("-fill") || lid.endsWith("-outline");

  switch (layer.type) {
    case "fill":
      map.setPaintProperty(lid, "fill-opacity", featureDimExpr(entryId, 1));
      break;
    case "line":
      map.setPaintProperty(lid, "line-opacity", featureDimExpr(entryId, isFillOrOutline ? 1 : ["get", "opacity"]));
      break;
    case "symbol":
      if (lid.endsWith("-text")) {
        map.setPaintProperty(lid, "text-opacity", featureDimExpr(entryId, ["get", "opacity"]));
      } else {
        map.setPaintProperty(lid, "icon-opacity", featureDimExpr(entryId, ["get", "opacity"]));
      }
      break;
  }
}

function resetFeatureLayer(map: maplibregl.Map, layer: maplibregl.LayerSpecification) {
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
