"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

const STORAGE_KEY = "idomaps:current";
const MIGRATED_KEY = "idomaps:migrated";

export default function MigrationGuard() {
  const { isAuthenticated } = useConvexAuth();
  const migrate = useMutation(api.maps.migrateFromLocalStorage);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hasRun.current) return;
    hasRun.current = true;

    try {
      if (localStorage.getItem(MIGRATED_KEY)) return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || !saved.map || !Array.isArray(saved.features)) return;
      if (saved.features.length === 0) return;

      localStorage.setItem(MIGRATED_KEY, "1");

      migrate({
        title: saved.map.title ?? "Imported map",
        description: saved.map.description ?? "",
        tags: saved.map.tags ?? [],
        center: saved.map.center ?? [2.3, 46.5],
        zoom: saved.map.zoom ?? 5,
        baseMapId: saved.baseMapId ?? "osm",
        layers: [{ id: "default", name: "Main layer", visible: true, order: 0 }],
        features: saved.features,
        groups: saved.groups ?? [],
      })
        .then(() => {
          localStorage.removeItem(STORAGE_KEY);
        })
        .catch((err) => {
          localStorage.removeItem(MIGRATED_KEY);
          console.error(err);
        });
    } catch {
      // localStorage read failed
    }
  }, [isAuthenticated, migrate]);

  return null;
}
