"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { ZF } from "./use-feature-rendering";

export function useFeatureTooltip(
  mapRef: React.RefObject<maplibregl.Map | null>,
  drawMode: string,
  styleVersion: number,
  hasSelection?: boolean,
) {
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "mapmaker-tooltip",
      maxWidth: "260px",
    });
    popupRef.current = popup;

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (drawMode !== "select" || hasSelection) {
        popup.remove();
        return;
      }

      const layers = (map.getStyle().layers ?? [])
        .filter((l) => l.id.startsWith(ZF))
        .map((l) => l.id);
      if (layers.length === 0) { popup.remove(); return; }

      const hits = map.queryRenderedFeatures(e.point, { layers });
      if (hits.length === 0) {
        popup.remove();
        map.getCanvas().style.cursor = "";
        return;
      }

      const props = hits[0].properties;
      const label = props?.label || "";
      const description = props?.description || "";
      if (!label && !description) {
        popup.remove();
        return;
      }

      const labelHtml = label ? `<strong>${escapeHtml(label)}</strong>` : "";
      const descHtml = description ? `<div style="margin-top:2px;opacity:0.85">${escapeHtml(description)}</div>` : "";
      popup
        .setLngLat(e.lngLat)
        .setHTML(`${labelHtml}${descHtml}`)
        .addTo(map);
    };

    const onMouseLeave = () => popup.remove();

    const setup = () => {
      map.on("mousemove", onMouseMove);
      map.on("mouseout", onMouseLeave);
    };

    if (map.isStyleLoaded()) setup();
    else map.once("idle", setup);

    return () => {
      popup.remove();
      map.off("mousemove", onMouseMove);
      map.off("mouseout", onMouseLeave);
    };
  }, [mapRef, drawMode, styleVersion, hasSelection]);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}
