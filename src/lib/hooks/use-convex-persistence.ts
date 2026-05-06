"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { StoredMapState } from "../editor-context";
import { toMapData } from "../convex-mapdata";
import { serializeChoropleth, deserializeChoropleth } from "../choropleth-serde";

interface MapFileData {
  features: StoredMapState["features"];
  groups: StoredMapState["groups"];
  legendEntries: StoredMapState["legendEntries"];
  choropleth?: StoredMapState["choropleth"];
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

const SAVE_DEBOUNCE_MS = 4000;

export function useConvexPersistence(mapId: string) {
  const [cachedData, setCachedData] = useState<StoredMapState | null>(null);
  const convexMap = useQuery(api.maps.getMap, cachedData ? "skip" : { mapId: mapId as Id<"maps"> });
  const saveMapMutation = useMutation(api.maps.saveMap);
  const generateUploadUrl = useMutation(api.maps.generateUploadUrl);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingSaveRef = useRef<(() => Promise<void>) | null>(null);
  const lastSavedHashRef = useRef<string | null>(null);
  const lastMetadataHashRef = useRef<string | null>(null);
  const lastFullMetadataHashRef = useRef<string | null>(null);
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

  const computedData: StoredMapState | null = (() => {
    if (!convexMap) return null;
    const map = toMapData(convexMap);
    const baseMapId = convexMap.baseMapId;
    const raw = convexMap as Record<string, unknown>;
    const styleOptions = (raw.styleOptions as StoredMapState["styleOptions"]) ?? undefined;
    if (hasInlineData) {
      return { map, features: convexMap.features, groups: convexMap.groups, legendEntries: raw.legendEntries as StoredMapState["legendEntries"] ?? [], baseMapId, styleOptions, choropleth: deserializeChoropleth(raw.choropleth) };
    }
    if (fileData) {
      return { map, features: fileData.features, groups: fileData.groups, legendEntries: fileData.legendEntries ?? [], baseMapId, styleOptions, choropleth: deserializeChoropleth(fileData.choropleth) };
    }
    return null;
  })();

  useEffect(() => {
    if (computedData && !cachedData) setCachedData(computedData);
  }, [computedData, cachedData]);

  const initialData = cachedData ?? computedData;

  const uploadAbortRef = useRef<AbortController | null>(null);

  const onSave = useCallback(
    (state: StoredMapState) => {
      if (savePausedRef.current) return;
      const serializedChoropleth = serializeChoropleth(state.choropleth);
      const payload = JSON.stringify({ features: state.features, groups: state.groups, legendEntries: state.legendEntries, choropleth: serializedChoropleth });
      const payloadHash = hashString(payload);
      const visibleFeatureCount = state.features.filter((f) =>
        f.type === "text" ? Boolean(f.textContent?.trim()) : true,
      ).length;
      const metadata = {
        mapId: mapId as Id<"maps">,
        title: state.map.title,
        description: state.map.description,
        tags: state.map.tags,
        center: state.map.center,
        zoom: state.map.zoom,
        baseMapId: state.baseMapId,
        styleOptions: state.styleOptions,
        zoomLocked: state.map.zoomLocked,
        panLocked: state.map.panLocked,
        visibleFeatureCount,
      };
      const fullMetadataHash = hashString(JSON.stringify(metadata));
      if (payloadHash === lastSavedHashRef.current && fullMetadataHash === lastFullMetadataHashRef.current) return;
      const metadataHash = hashString(`${state.map.title}|${state.map.description}`);

      const doSave = async () => {
        try {
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

          await saveMapMutation({ ...metadata, dataFileId: storageId });
          lastSavedHashRef.current = payloadHash;
          lastFullMetadataHashRef.current = fullMetadataHash;
          if (lastMetadataHashRef.current !== null && lastMetadataHashRef.current !== metadataHash) {
            void fetch("/api/revalidate-og", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mapId }),
            }).catch(() => {});
          }
          lastMetadataHashRef.current = metadataHash;
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
      };

      clearTimeout(saveTimerRef.current);
      pendingSaveRef.current = doSave;
      saveTimerRef.current = setTimeout(async () => {
        pendingSaveRef.current = null;
        await doSave();
      }, SAVE_DEBOUNCE_MS);
    },
    [mapId, saveMapMutation, generateUploadUrl]
  );

  useEffect(() => {
    const handler = () => {
      if (!pendingSaveRef.current) return;
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;
      clearTimeout(saveTimerRef.current);
      void pending();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return {
    initialData,
    onSave,
    saveError,
    isLoading: !initialData && (convexMap === undefined || fileLoading || (!!dataFileUrl && !fileData && !saveError)),
    notFound: !initialData && convexMap === null,
  };
}
