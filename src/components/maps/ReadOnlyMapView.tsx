"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useFeatureRendering } from "@/lib/hooks/use-feature-rendering";
import { BASE_MAPS } from "@/lib/map-style";
import { LegendDisplay } from "@/components/ui/legend-display";
import type { MapData, LayerData, FeatureData, GroupData, LegendEntry } from "@/lib/types";

interface ReadOnlyMapViewProps {
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  groups: GroupData[];
  legendEntries?: LegendEntry[];
  baseMapId: string;
}

export default function ReadOnlyMapView({
  map: mapData,
  layers,
  features,
  groups,
  legendEntries = [],
  baseMapId,
}: ReadOnlyMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const baseMap = BASE_MAPS.find((b) => b.id === baseMapId) ?? BASE_MAPS[0];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseMap.style as maplibregl.StyleSpecification,
      center: mapData.center,
      zoom: mapData.zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [baseMap.style]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setCenter(mapData.center as [number, number]);
    map.setZoom(mapData.zoom);
  }, [mapData.center, mapData.zoom]);

  useFeatureRendering(mapRef, features, layers, groups, 0, legendEntries);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-semibold">{mapData.title}</h1>
        {mapData.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {mapData.description}
          </p>
        )}
        {mapData.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {mapData.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          License: {mapData.license}
        </p>
      </div>
      <div ref={containerRef} className="flex-1 relative">
        <LegendDisplay features={features} legendEntries={legendEntries} />
      </div>
    </div>
  );
}
