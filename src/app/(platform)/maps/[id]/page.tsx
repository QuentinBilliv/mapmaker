"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import ReadOnlyMapView from "@/components/maps/ReadOnlyMapView";
import { toMapData } from "@/lib/convex-mapdata";

export default function MapViewPage({ params }: { params: { id: string } }) {
  const map = useQuery(api.maps.getMap, {
    mapId: params.id as Id<"maps">,
  });

  if (map === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (map === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Map not found or access denied.
        </p>
      </div>
    );
  }

  return (
    <ReadOnlyMapView
      map={toMapData(map)}
      layers={map.layers}
      features={map.features}
      groups={map.groups}
      baseMapId={map.baseMapId}
    />
  );
}
