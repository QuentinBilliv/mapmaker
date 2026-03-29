"use client";

import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BaseMap } from "@/lib/map-style";
import type { LngLatBounds } from "@/lib/geojson";

export function useMapInit(
  containerRef: React.RefObject<HTMLDivElement | null>,
  center: [number, number],
  zoom: number,
  baseMap: BaseMap,
  bounds?: LngLatBounds | null
) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [styleVersion, setStyleVersion] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const opts: maplibregl.MapOptions = {
      container: containerRef.current,
      style: baseMap.style,
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

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(baseMap.style);
    const onReady = () => setStyleVersion(v => v + 1);
    map.once("idle", onReady);
    return () => { map.off("idle", onReady); };
  }, [baseMap]);

  return { mapRef, styleVersion };
}
