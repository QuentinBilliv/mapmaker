"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { ZF, HOVER_HIGHLIGHT, CHOROPLETH_FILL } from "./use-feature-rendering";

const NO_MATCH: maplibregl.FilterSpecification = ["==", ["get", "id"], " "];

interface StackedPoly {
  id: string;
  label: string;
  description: string;
  imageUrl: string;
  area: number;
}

function collectStackedPolygons(
  map: maplibregl.Map,
  point: maplibregl.PointLike,
): StackedPoly[] {
  const featureLayers = (map.getStyle().layers ?? [])
    .filter((l) => l.id.startsWith(ZF))
    .map((l) => l.id);
  if (featureLayers.length === 0) return [];
  const hits = map.queryRenderedFeatures(point, { layers: featureLayers });
  const seen = new Set<string>();
  const polys: StackedPoly[] = [];
  for (const h of hits) {
    const p = h.properties ?? {};
    if (p.featureType !== "polygon") continue;
    const id = p.id as string;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    polys.push({
      id,
      label: p.label || "",
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      area: typeof p.area === "number" ? p.area : Number(p.area) || 0,
    });
  }
  // Most specific first = smallest rohe; nothing stays hidden under another.
  polys.sort((a, b) => a.area - b.area);
  return polys;
}

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

    const detailPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      className: "idomaps-tooltip idomaps-tooltip-detail",
      maxWidth: "340px",
    });

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
      let stackedNames: string[] = [];

      if (featureLayers.length > 0) {
        const polys = collectStackedPolygons(map, e.point);
        if (polys.length > 0) {
          const primary = polys[0];
          label = primary.label;
          description = primary.description;
          imageUrl = primary.imageUrl;
          stackedNames = polys.map((p) => p.label).filter(Boolean);
          setHover(primary.id);
        } else {
          const hits = map.queryRenderedFeatures(e.point, { layers: featureLayers });
          if (hits.length > 0) {
            label = hits[0].properties?.label || "";
            description = hits[0].properties?.description || "";
            imageUrl = hits[0].properties?.imageUrl || "";
          }
          setHover(null);
        }
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
      if (!label && !subtitle && !description && !imageUrl && stackedNames.length === 0) {
        popup.remove();
        map.getCanvas().style.cursor = "";
        return;
      }

      popup.options.maxWidth = imageUrl ? "320px" : "260px";

      const imgHtml = imageUrl && /^https?:\/\//i.test(imageUrl)
        ? `<img class="idomaps-tooltip-img" src="${escapeHtml(imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.classList.add('loaded')" onerror="this.style.display='none'" />`
        : "";
      let labelHtml: string;
      if (stackedNames.length > 1) {
        const countHtml = `<div style="font-size:11px;opacity:0.6;margin-bottom:2px">${stackedNames.length} overlapping here · click for details</div>`;
        const listHtml = stackedNames
          .map((n) => `<strong>${escapeHtml(n)}</strong>`)
          .join("<br>");
        labelHtml = `${countHtml}${listHtml}`;
      } else {
        labelHtml = label ? `<strong>${escapeHtml(label)}</strong>` : "";
      }
      const subtitleHtml = subtitle ? `<div class="idomaps-tooltip-subtitle">${escapeHtml(subtitle)}</div>` : "";
      const descHtml = description ? `<div style="margin-top:4px;opacity:0.85">${escapeHtml(description)}</div>` : "";
      popup
        .setLngLat(e.lngLat)
        .setHTML(`${imgHtml}${labelHtml}${subtitleHtml}${descHtml}`)
        .addTo(map);
    };

    const onMouseLeave = () => { popup.remove(); setHover(null); };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (drawMode !== "select" || isChoroplethEditing) return;
      const polys = collectStackedPolygons(map, e.point);
      // The detail panel only earns its keep when rohe overlap — a single
      // feature is already fully covered by the hover tooltip.
      if (polys.length < 2) return;

      const header = `<div style="font-size:11px;opacity:0.6;margin-bottom:6px">${polys.length} overlapping here</div>`;
      const rows = polys
        .map((p) => {
          const name = p.label ? `<strong>${escapeHtml(p.label)}</strong>` : "";
          const desc = p.description
            ? `<div style="margin-top:2px;opacity:0.85">${escapeHtml(p.description)}</div>`
            : "";
          return `<div style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.12)">${name}${desc}</div>`;
        })
        .join("");
      const body = `<div style="max-height:50vh;overflow-y:auto">${header}${rows}</div>`;
      detailPopup.setLngLat(e.lngLat).setHTML(body).addTo(map);
    };

    let cancelled = false;
    const setup = () => {
      if (cancelled) return;
      map.on("mousemove", onMouseMove);
      map.on("mouseout", onMouseLeave);
      map.on("click", onClick);
    };

    if (map.isStyleLoaded()) setup();
    else map.once("idle", setup);

    return () => {
      cancelled = true;
      popup.remove();
      detailPopup.remove();
      setHover(null);
      map.off("mousemove", onMouseMove);
      map.off("mouseout", onMouseLeave);
      map.off("click", onClick);
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
