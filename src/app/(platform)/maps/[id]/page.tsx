"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import ReadOnlyMapView from "@/components/maps/ReadOnlyMapView";
import { toMapData } from "@/lib/convex-mapdata";
import type { LayerData, FeatureData, GroupData, LegendEntry } from "@/lib/types";

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

export default function MapViewPage({ params }: { params: { id: string } }) {
  const map = useQuery(api.maps.getMap, {
    mapId: params.id as Id<"maps">,
  });

  const isOwner = useIsOwner(map);
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

  if (map === undefined) return <Loading />;

  if (map === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Map not found or access denied.
        </p>
      </div>
    );
  }

  const data = hasInlineData
    ? { layers: map.layers!, features: map.features!, groups: map.groups!, legendEntries: (map as Record<string, unknown>).legendEntries as LegendEntry[] ?? [] }
    : fileData;

  if (!data) return <Loading />;

  return (
    <>
      <div className="px-4 py-2 border-b shrink-0">
        <h1 className="text-lg font-semibold">{map.title || "Untitled map"}</h1>
      </div>
      <ReadOnlyMapView
        map={toMapData(map)}
        layers={data.layers}
        features={data.features}
        groups={data.groups}
        legendEntries={data.legendEntries ?? []}
        baseMapId={map.baseMapId}
        editHref={isOwner ? `/maps/${params.id}/edit` : undefined}
      />
    </>
  );
}
