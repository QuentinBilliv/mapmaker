"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useFeatureRendering } from "@/lib/hooks/use-feature-rendering";
import { useFeatureTooltip } from "@/lib/hooks/use-feature-tooltip";
import { HighlightProvider } from "@/lib/highlight-context";
import { BASE_MAPS } from "@/lib/map-style";
import { LegendDisplay } from "@/components/ui/legend-display";
import { toMapData } from "@/lib/convex-mapdata";
import type { LayerData, FeatureData, GroupData, LegendEntry } from "@/lib/types";

export default function EmbedPage({ params }: { params: { id: string } }) {
  const map = useQuery(api.maps.getMap, {
    mapId: params.id as Id<"maps">,
  });

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

  if (map === undefined) {
    return <div className="w-full h-full flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  }

  if (map === null) {
    return <div className="w-full h-full flex items-center justify-center"><p className="text-sm text-muted-foreground">Map not found</p></div>;
  }

  const data = hasInlineData
    ? { layers: map.layers!, features: map.features!, groups: map.groups!, legendEntries: (map as Record<string, unknown>).legendEntries as LegendEntry[] ?? [] }
    : fileData;

  if (!data) {
    return <div className="w-full h-full flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  }

  return (
    <HighlightProvider>
      <EmbedMapView
        mapData={toMapData(map)}
        layers={data.layers}
        features={data.features}
        groups={data.groups}
        legendEntries={data.legendEntries ?? []}
        baseMapId={map.baseMapId}
        mapId={params.id}
      />
    </HighlightProvider>
  );
}

function EmbedMapView({
  mapData,
  layers,
  features,
  groups,
  legendEntries,
  baseMapId,
  mapId,
}: {
  mapData: ReturnType<typeof toMapData>;
  layers: LayerData[];
  features: FeatureData[];
  groups: GroupData[];
  legendEntries: LegendEntry[];
  baseMapId: string;
  mapId: string;
}) {
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
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [baseMap.style, mapData.center, mapData.zoom]);

  useFeatureRendering(mapRef, features, layers, groups, 0, legendEntries);
  useFeatureTooltip(mapRef, "select", 0);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      <LegendDisplay features={features} legendEntries={legendEntries} />
      <a
        href={`/maps/${mapId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 z-10 px-2 py-1 rounded bg-white/80 backdrop-blur-sm border border-black/10 text-[10px] text-black/60 hover:text-black transition-colors no-underline"
      >
        Open in MapMaker
      </a>
    </div>
  );
}
