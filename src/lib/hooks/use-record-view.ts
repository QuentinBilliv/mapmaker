"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const VIEW_RECORD_DELAY_MS = 3000;

export function useRecordView(mapId: string | null | undefined) {
  const recordView = useMutation(api.mapStats.recordView);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!mapId || firedRef.current) return;
    if (typeof window === "undefined") return;
    const sessionKey = `viewed:${mapId}`;
    if (window.sessionStorage.getItem(sessionKey)) return;
    const timer = setTimeout(() => {
      firedRef.current = true;
      window.sessionStorage.setItem(sessionKey, "1");
      recordView({ mapId: mapId as Id<"maps"> }).catch(() => {});
    }, VIEW_RECORD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [mapId, recordView]);
}
