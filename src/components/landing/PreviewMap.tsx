"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useFeatureRendering } from "@/lib/hooks/use-feature-rendering";
import { HighlightProvider } from "@/lib/highlight-context";
import { BASE_MAPS } from "@/lib/map-style";
import { toMapData } from "@/lib/convex-mapdata";
import type { LayerData, FeatureData, GroupData, LegendEntry } from "@/lib/types";

interface PreviewMapProps {
  mapId: Id<"maps">;
  active: boolean;
}

export default function PreviewMap({ mapId, active }: PreviewMapProps) {
  const map = useQuery(api.maps.getMap, { mapId });
  const dataFileUrl = map && "dataFileUrl" in map ? (map.dataFileUrl as string | null) : null;
  const hasInlineData = map && "features" in map && map.features != null;

  const [fileData, setFileData] = useState<{
    layers: LayerData[];
    features: FeatureData[];
    groups: GroupData[];
    legendEntries?: LegendEntry[];
  } | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!dataFileUrl || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetch(dataFileUrl)
      .then((res) => res.json())
      .then(setFileData)
      .catch(console.error);
  }, [dataFileUrl]);

  if (!map) return <div className="w-full h-full bg-[#1a1a1a]" />;

  const data = hasInlineData
    ? { layers: map.layers!, features: map.features!, groups: map.groups!, legendEntries: (map as Record<string, unknown>).legendEntries as LegendEntry[] ?? [] }
    : fileData;

  if (!data) return <div className="w-full h-full bg-[#1a1a1a]" />;

  return (
    <HighlightProvider>
      <PreviewMapInner
        mapData={toMapData(map)}
        layers={data.layers}
        features={data.features}
        groups={data.groups}
        legendEntries={data.legendEntries ?? []}
        baseMapId={map.baseMapId}
        active={active}
      />
    </HighlightProvider>
  );
}

function PreviewMapInner({
  mapData,
  layers,
  features,
  groups,
  legendEntries,
  baseMapId,
  active,
}: {
  mapData: ReturnType<typeof toMapData>;
  layers: LayerData[];
  features: FeatureData[];
  groups: GroupData[];
  legendEntries: LegendEntry[];
  baseMapId: string;
  active: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const baseMap = BASE_MAPS.find((b) => b.id === baseMapId) ?? BASE_MAPS[0];

  useEffect(() => {
    if (!active || !containerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseMap.style as maplibregl.StyleSpecification,
      center: mapData.center,
      zoom: mapData.zoom,
      interactive: false,
      attributionControl: false,
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [active, baseMap.style, mapData.center, mapData.zoom]);

  useFeatureRendering(mapRef, active ? features : [], layers, groups, 0, legendEntries);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-5 pt-12">
        <h3 className="text-white font-semibold text-base">{mapData.title}</h3>
        {mapData.description && (
          <p className="text-white/60 text-xs mt-1 line-clamp-1">{mapData.description}</p>
        )}
      </div>
    </div>
  );
}
