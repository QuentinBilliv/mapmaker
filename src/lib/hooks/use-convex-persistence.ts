"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { StoredMapState } from "../editor-context";
import { toMapData } from "../convex-mapdata";

interface MapFileData {
  features: StoredMapState["features"];
  groups: StoredMapState["groups"];
  legendEntries: StoredMapState["legendEntries"];
  choropleth?: StoredMapState["choropleth"];
}

export function useConvexPersistence(mapId: string) {
  const convexMap = useQuery(api.maps.getMap, { mapId: mapId as Id<"maps"> });
  const saveMapMutation = useMutation(api.maps.saveMap);
  const generateUploadUrl = useMutation(api.maps.generateUploadUrl);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const savePausedRef = useRef(false);
  const [fileData, setFileData] = useState<MapFileData | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  const dataFileUrl = convexMap && "dataFileUrl" in convexMap ? (convexMap.dataFileUrl as string | null) : null;
  const hasInlineData = convexMap && "features" in convexMap && convexMap.features != null;

  useEffect(() => {
    if (!dataFileUrl || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    setFileLoading(true);
    fetch(dataFileUrl)
      .then((res) => res.json())
      .then((data: MapFileData) => setFileData(data))
      .catch(() => setSaveError("Failed to load map data file."))
      .finally(() => setFileLoading(false));
  }, [dataFileUrl]);

  const initialData: StoredMapState | null = (() => {
    if (!convexMap) return null;
    const map = toMapData(convexMap);
    const baseMapId = convexMap.baseMapId;
    const raw = convexMap as Record<string, unknown>;
    const styleOptions = (raw.styleOptions as StoredMapState["styleOptions"]) ?? undefined;
    if (hasInlineData) {
      return { map, features: convexMap.features, groups: convexMap.groups, legendEntries: raw.legendEntries as StoredMapState["legendEntries"] ?? [], baseMapId, styleOptions, choropleth: raw.choropleth as StoredMapState["choropleth"] };
    }
    if (fileData) {
      return { map, features: fileData.features, groups: fileData.groups, legendEntries: fileData.legendEntries ?? [], baseMapId, styleOptions, choropleth: fileData.choropleth };
    }
    return null;
  })();

  const uploadAbortRef = useRef<AbortController | null>(null);

  const INLINE_THRESHOLD = 500_000;

  const onSave = useCallback(
    (state: StoredMapState) => {
      if (savePausedRef.current) return;
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          const payload = JSON.stringify({ features: state.features, groups: state.groups, legendEntries: state.legendEntries, choropleth: state.choropleth });
          const payloadSize = new Blob([payload]).size;
          const metadata = {
            mapId: mapId as Id<"maps">,
            title: state.map.title,
            description: state.map.description,
            tags: state.map.tags,
            license: state.map.license,
            center: state.map.center,
            zoom: state.map.zoom,
            baseMapId: state.baseMapId,
            styleOptions: state.styleOptions,
          };

          if (payloadSize < INLINE_THRESHOLD) {
            await saveMapMutation({
              ...metadata,
              features: state.features,
              groups: state.groups,
              legendEntries: state.legendEntries,
              choropleth: state.choropleth,
            });
          } else {
            uploadAbortRef.current?.abort();
            const abort = new AbortController();
            uploadAbortRef.current = abort;

            const uploadUrl = await generateUploadUrl();
            if (abort.signal.aborted) return;

            const uploadRes = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payload,
              signal: abort.signal,
            });
            if (!uploadRes.ok) throw new Error("Upload failed");
            const { storageId } = await uploadRes.json();
            if (abort.signal.aborted) return;

            await saveMapMutation({
              ...metadata,
              dataFileId: storageId,
            });
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          const msg = (err as Error).message ?? "";
          if (msg.includes("too large") || msg.includes("too long") || msg.includes("Too many")) {
            savePausedRef.current = true;
            setSaveError("Map is too large to save. Remove some features or custom icons, then reload.");
          } else {
            console.error(err);
          }
        }
      }, 2500);
    },
    [mapId, saveMapMutation, generateUploadUrl]
  );

  return {
    initialData,
    onSave,
    saveError,
    isLoading: convexMap === undefined || fileLoading || (!!dataFileUrl && !fileData && !saveError),
    notFound: convexMap === null,
  };
}
