"use client";

import { useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { StoredMapState } from "../editor-context";
import { toMapData } from "../convex-mapdata";

export function useConvexPersistence(mapId: string) {
  const convexMap = useQuery(api.maps.getMap, { mapId: mapId as Id<"maps"> });
  const saveMapMutation = useMutation(api.maps.saveMap);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const initialData: StoredMapState | null = convexMap
    ? {
        map: toMapData(convexMap),
        layers: convexMap.layers,
        features: convexMap.features,
        groups: convexMap.groups,
        baseMapId: convexMap.baseMapId,
      }
    : null;

  const onSave = useCallback(
    (state: StoredMapState) => {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveMapMutation({
          mapId: mapId as Id<"maps">,
          title: state.map.title,
          description: state.map.description,
          tags: state.map.tags,
          license: state.map.license,
          center: state.map.center,
          zoom: state.map.zoom,
          baseMapId: state.baseMapId,
          layers: state.layers,
          features: state.features,
          groups: state.groups,
        }).catch(console.error);
      }, 500);
    },
    [mapId, saveMapMutation]
  );

  return {
    initialData,
    onSave,
    isLoading: convexMap === undefined,
    notFound: convexMap === null,
  };
}
