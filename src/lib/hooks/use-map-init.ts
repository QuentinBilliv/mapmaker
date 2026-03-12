"use client";

import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BaseMap } from "@/lib/map-style";

export function useMapInit(
  containerRef: React.RefObject<HTMLDivElement | null>,
  center: [number, number],
  zoom: number,
  baseMap: BaseMap
) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [styleVersion, setStyleVersion] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseMap.style,
      center,
      zoom,
      doubleClickZoom: false,
    });

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
