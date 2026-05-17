"use client";

import { useEffect, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import ReadOnlyMapView from "@/components/maps/ReadOnlyMapView";
import { toMapData } from "@/lib/convex-mapdata";
import type { FeatureData, GroupData, LegendEntry, ChoroplethData } from "@/lib/types";
import { deserializeChoropleth } from "@/lib/choropleth-serde";
import { fetchAndDecodeMapData } from "@/lib/storage-codec";
import { useRecordView } from "@/lib/hooks/use-record-view";

type MapSnapshot = FunctionReturnType<typeof api.maps.getMap>;

function useIsOwner(map: { ownerId?: string } | null | undefined): boolean {
  const me = useQuery(api.users.getMe);
  if (!map || !me) return false;
  return map.ownerId === me._id;
}

function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

export default function MapViewClient({ params }: { params: { id: string } }) {
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

  const isOwner = useIsOwner(map);
  const dataFileUrl = map && "dataFileUrl" in map ? (map.dataFileUrl as string | null) : null;
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

  if (map === undefined) return <Loading />;

  if (map === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          This map is not available.
        </p>
      </div>
    );
  }

  const raw = map as Record<string, unknown>;
  const data = hasInlineData
    ? { features: map.features!, groups: map.groups!, legendEntries: raw.legendEntries as LegendEntry[] ?? [], choropleth: deserializeChoropleth(raw.choropleth) }
    : fileData
      ? { ...fileData, choropleth: deserializeChoropleth(fileData.choropleth) }
      : null;

  if (!data) return <Loading />;

  return (
    <>
      <div className="px-4 py-2 border-b shrink-0">
        <h1 className="text-lg font-semibold">{map.title || "Untitled map"}</h1>
      </div>
      <ReadOnlyMapView
        map={toMapData(map)}
        features={data.features}
        groups={data.groups}
        legendEntries={data.legendEntries ?? []}
        choropleth={data.choropleth}
        baseMapId={map.baseMapId}
        styleOptions={(map as Record<string, unknown>).styleOptions as import("@/lib/map-style").StyleOptions | undefined}
        editHref={isOwner ? `/maps/${params.id}/edit` : undefined}
      />
    </>
  );
}
