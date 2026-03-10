"use client";

import { useState, useEffect } from "react";
import { type IconType } from "react-icons";
import { getCatalogEntry, loadCatalogEntry } from "@/lib/icon-catalog";

export function useCatalogIcon(id: string | null | undefined): IconType | null {
  const [Icon, setIcon] = useState<IconType | null>(
    () => (id ? getCatalogEntry(id)?.Icon : null) ?? null
  );

  useEffect(() => {
    if (!id) { setIcon(null); return; }
    const cached = getCatalogEntry(id);
    if (cached) { setIcon(() => cached.Icon); return; }
    loadCatalogEntry(id).then((e) => setIcon(e ? () => e.Icon : null));
  }, [id]);

  return Icon;
}
