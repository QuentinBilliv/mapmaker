"use client";

import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { resolveBaseMapStyle, type BaseMap, type StyleOptions } from "@/lib/map-style";
import type { LngLatBounds } from "@/lib/geojson";

export function useMapInit(
  containerRef: React.RefObject<HTMLDivElement | null>,
  center: [number, number],
  zoom: number,
  baseMap: BaseMap,
  bounds?: LngLatBounds | null,
  styleOptions: StyleOptions = {},
) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [styleVersion, setStyleVersion] = useState(0);
  const styleKey = `${baseMap.id}:${styleOptions.noLabels ? 1 : 0}:${styleOptions.noBorders ? 1 : 0}:${styleOptions.noRoads ? 1 : 0}`;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    resolveBaseMapStyle(baseMap, styleOptions).then((style) => {
      if (cancelled || !containerRef.current) return;

      const opts: maplibregl.MapOptions = {
        container: containerRef.current,
        style,
        doubleClickZoom: false,
      };
      if (bounds) {
        opts.bounds = bounds as maplibregl.LngLatBoundsLike;
        opts.fitBoundsOptions = { padding: 60, maxZoom: 16 };
      } else {
        opts.center = center;
        opts.zoom = zoom;
      }

      const map = new maplibregl.Map(opts);
      map.addControl(new maplibregl.NavigationControl(), "bottom-right");
      map.addControl(new maplibregl.ScaleControl(), "bottom-left");
      mapRef.current = map;
      map.once("idle", () => setStyleVersion((v) => v + 1));
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    resolveBaseMapStyle(baseMap, styleOptions).then((style) => {
      map.setStyle(style);
    });
    const onReady = () => setStyleVersion(v => v + 1);
    map.once("idle", onReady);
    return () => { map.off("idle", onReady); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey]);

  return { mapRef, styleVersion };
}
