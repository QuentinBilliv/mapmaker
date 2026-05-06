"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useFeatureRendering } from "@/lib/hooks/use-feature-rendering";
import { useFeatureTooltip } from "@/lib/hooks/use-feature-tooltip";
import { useLegendHighlight } from "@/lib/hooks/use-legend-highlight";
import { HighlightProvider } from "@/lib/highlight-context";
import { findBaseMap, resolveBaseMapStyle } from "@/lib/map-style";
import { LegendDisplay } from "@/components/ui/legend-display";
import { toMapData } from "@/lib/convex-mapdata";
import { computeFeaturesBounds } from "@/lib/geojson";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/defaults";
import type {
  FeatureData,
  GroupData,
  LegendEntry,
  ChoroplethData,
} from "@/lib/types";
import { DEFAULT_CHOROPLETH } from "@/lib/types";
import { useChoroplethDisplay } from "@/lib/hooks/use-choropleth-display";
import { choroplethLegendProps } from "@/lib/choropleth-legend";
import { deserializeChoropleth } from "@/lib/choropleth-serde";
import { fetchAndDecodeMapData } from "@/lib/storage-codec";
import { useRecordView } from "@/lib/hooks/use-record-view";

type MapSnapshot = FunctionReturnType<typeof api.maps.getMap>;

export default function EmbedPage({ params }: { params: { id: string } }) {
  const convex = useConvex();
  const [map, setMap] = useState<MapSnapshot | undefined>(undefined);
  useRecordView(params.id);

  useEffect(() => {
    let cancelled = false;
    convex
      .query(api.maps.getMap, { mapId: params.id as Id<"maps"> })
      .then((result) => {
        if (!cancelled) setMap(result as MapSnapshot);
      })
      .catch(() => {
        if (!cancelled) setMap(null);
      });
    return () => {
      cancelled = true;
    };
  }, [convex, params.id]);

  const dataFileUrl =
    map && "dataFileUrl" in map ? (map.dataFileUrl as string | null) : null;
  const hasInlineData = map && "features" in map && map.features != null;

  const [fileData, setFileData] = useState<{
    features: FeatureData[];
    groups: GroupData[];
    legendEntries?: LegendEntry[];
    choropleth?: ChoroplethData;
  } | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!dataFileUrl || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchAndDecodeMapData<{
      features: FeatureData[];
      groups: GroupData[];
      legendEntries?: LegendEntry[];
      choropleth?: ChoroplethData;
    }>(dataFileUrl)
      .then(setFileData)
      .catch(console.error);
  }, [dataFileUrl]);

  if (map === undefined) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (map === null) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Map not found</p>
      </div>
    );
  }

  const raw = map as Record<string, unknown>;
  const data = hasInlineData
    ? {
        features: map.features!,
        groups: map.groups!,
        legendEntries: (raw.legendEntries as LegendEntry[]) ?? [],
        choropleth: deserializeChoropleth(raw.choropleth),
      }
    : fileData
      ? { ...fileData, choropleth: deserializeChoropleth(fileData.choropleth) }
      : null;

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <HighlightProvider>
      <EmbedMapView
        mapData={toMapData(map)}
        features={data.features}
        groups={data.groups}
        legendEntries={data.legendEntries ?? []}
        choropleth={data.choropleth ?? DEFAULT_CHOROPLETH}
        baseMapId={map.baseMapId}
        styleOptions={
          (map as Record<string, unknown>).styleOptions as
            | import("@/lib/map-style").StyleOptions
            | undefined
        }
        mapId={params.id}
      />
    </HighlightProvider>
  );
}

function EmbedMapView({
  mapData,
  features,
  groups,
  legendEntries,
  choropleth,
  baseMapId,
  styleOptions,
  mapId,
}: {
  mapData: ReturnType<typeof toMapData>;
  features: FeatureData[];
  groups: GroupData[];
  legendEntries: LegendEntry[];
  choropleth: ChoroplethData;
  baseMapId: string;
  styleOptions?: import("@/lib/map-style").StyleOptions;
  mapId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [styleVersion, setStyleVersion] = useState(0);
  const baseMap = findBaseMap(baseMapId);
  const isDefaultView =
    mapData.center[0] === DEFAULT_CENTER[0] &&
    mapData.center[1] === DEFAULT_CENTER[1] &&
    mapData.zoom === DEFAULT_ZOOM;
  const bounds = useMemo(
    () => (isDefaultView ? computeFeaturesBounds(features) : null),
    [features, isDefaultView],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    resolveBaseMapStyle(baseMap, styleOptions).then((style) => {
      if (cancelled || !containerRef.current) return;
      const opts: maplibregl.MapOptions = {
        container: containerRef.current,
        style: style as maplibregl.StyleSpecification,
      };
      if (bounds) {
        opts.bounds = bounds as maplibregl.LngLatBoundsLike;
        opts.fitBoundsOptions = { padding: 60, maxZoom: 16 };
      } else {
        opts.center = mapData.center;
        opts.zoom = mapData.zoom;
      }
      const map = new maplibregl.Map(opts);
      if (mapData.zoomLocked) {
        map.scrollZoom.disable();
        map.boxZoom.disable();
        map.doubleClickZoom.disable();
        map.touchZoomRotate.disable();
      }
      if (mapData.panLocked) {
        map.dragPan.disable();
        map.dragRotate.disable();
        map.keyboard.disable();
      }
      if (!mapData.zoomLocked || !mapData.panLocked) {
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right",
        );
      }
      mapRef.current = map;
      map.once("idle", () => setStyleVersion((v) => v + 1));
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [baseMap.style]);

  useFeatureRendering(mapRef, features, groups, styleVersion, legendEntries, choropleth);
  useChoroplethDisplay(mapRef, choropleth, styleVersion);
  useFeatureTooltip(mapRef, "select", styleVersion);
  useLegendHighlight(mapRef, styleVersion, choropleth.opacity);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      <LegendDisplay
        features={features}
        legendEntries={legendEntries}
        {...choroplethLegendProps(choropleth)}
      />
      <a
        href={`/maps/${mapId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 z-10 px-2 py-1 rounded bg-white/80 backdrop-blur-sm border border-black/10 text-[10px] text-black/60 hover:text-black transition-colors no-underline"
      >
        Open in idomaps
      </a>
    </div>
  );
}
