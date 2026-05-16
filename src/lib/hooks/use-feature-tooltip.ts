"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { ZF, HOVER_HIGHLIGHT, CHOROPLETH_FILL } from "./use-feature-rendering";

const NO_MATCH: maplibregl.FilterSpecification = ["==", ["get", "id"], " "];

export function useFeatureTooltip(
  mapRef: React.RefObject<maplibregl.Map | null>,
  drawMode: string,
  styleVersion: number,
  hasSelection?: boolean,
  isChoroplethEditing?: boolean,
) {
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "idomaps-tooltip",
      maxWidth: "260px",
    });
    popupRef.current = popup;

    let hoveredId: string | null = null;
    const setHover = (id: string | null) => {
      if (id === hoveredId) return;
      hoveredId = id;
      if (!map.getLayer(HOVER_HIGHLIGHT)) return;
      map.setFilter(
        HOVER_HIGHLIGHT,
        id ? ["==", ["get", "id"], id] : NO_MATCH,
      );
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (drawMode !== "select" || hasSelection || isChoroplethEditing) {
        popup.remove();
        setHover(null);
        return;
      }

      const featureLayers = (map.getStyle().layers ?? [])
        .filter((l) => l.id.startsWith(ZF))
        .map((l) => l.id);

      let label = "";
      let subtitle = "";
      let description = "";
      let imageUrl = "";

      if (featureLayers.length > 0) {
        const hits = map.queryRenderedFeatures(e.point, { layers: featureLayers });
        if (hits.length > 0) {
          label = hits[0].properties?.label || "";
          description = hits[0].properties?.description || "";
          imageUrl = hits[0].properties?.imageUrl || "";
        }
        const polyHit = hits.find((h) => h.properties?.featureType === "polygon");
        setHover(polyHit ? (polyHit.properties?.id as string) : null);
      } else {
        setHover(null);
      }

      if (!label && !description && map.getLayer(CHOROPLETH_FILL)) {
        const choroHits = map.queryRenderedFeatures(e.point, { layers: [CHOROPLETH_FILL] });
        if (choroHits.length > 0) {
          label = choroHits[0].properties?._tooltip_title || "";
          subtitle = choroHits[0].properties?._tooltip_subtitle || "";
          description = choroHits[0].properties?._tooltip_desc || "";
          imageUrl = choroHits[0].properties?._tooltip_image || "";
        }
      }
      if (!label && !subtitle && !description && !imageUrl) {
        popup.remove();
        map.getCanvas().style.cursor = "";
        return;
      }

      popup.options.maxWidth = imageUrl ? "320px" : "260px";

      const imgHtml = imageUrl && /^https?:\/\//i.test(imageUrl)
        ? `<img class="idomaps-tooltip-img" src="${escapeHtml(imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.classList.add('loaded')" onerror="this.style.display='none'" />`
        : "";
      const labelHtml = label ? `<strong>${escapeHtml(label)}</strong>` : "";
      const subtitleHtml = subtitle ? `<div class="idomaps-tooltip-subtitle">${escapeHtml(subtitle)}</div>` : "";
      const descHtml = description ? `<div style="margin-top:4px;opacity:0.85">${escapeHtml(description)}</div>` : "";
      popup
        .setLngLat(e.lngLat)
        .setHTML(`${imgHtml}${labelHtml}${subtitleHtml}${descHtml}`)
        .addTo(map);
    };

    const onMouseLeave = () => { popup.remove(); setHover(null); };

    let cancelled = false;
    const setup = () => {
      if (cancelled) return;
      map.on("mousemove", onMouseMove);
      map.on("mouseout", onMouseLeave);
    };

    if (map.isStyleLoaded()) setup();
    else map.once("idle", setup);

    return () => {
      cancelled = true;
      popup.remove();
      setHover(null);
      map.off("mousemove", onMouseMove);
      map.off("mouseout", onMouseLeave);
    };
  }, [mapRef, drawMode, styleVersion, hasSelection, isChoroplethEditing]);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}
