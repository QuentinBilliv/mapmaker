import { useCallback } from "react";
import { v4 as uuid } from "uuid";
import type { FeatureData, LegendEntry, NewLegendEntry } from "../types";
import { deduceLegendEntry as extractLegendEntry } from "../resolve-style";

interface Deps {
  featuresRef: React.RefObject<FeatureData[]>;
  legendEntriesRef: React.RefObject<LegendEntry[]>;
  setFeatures: React.Dispatch<React.SetStateAction<FeatureData[]>>;
  setLegendEntries: React.Dispatch<React.SetStateAction<LegendEntry[]>>;
  recordSnapshot: () => void;
}

export function useLegendActions({
  featuresRef, legendEntriesRef,
  setFeatures, setLegendEntries,
  recordSnapshot,
}: Deps) {
  const addLegendEntry = useCallback((entry: NewLegendEntry) => {
    recordSnapshot();
    const id = uuid();
    const order = Math.max(0, ...legendEntriesRef.current!.map((e) => e.order)) + 1;
    setLegendEntries((prev) => [...prev, { ...entry, id, order } as LegendEntry]);
    return id;
  }, [legendEntriesRef, setLegendEntries, recordSnapshot]);

  const updateLegendEntry = useCallback((id: string, updates: Partial<LegendEntry>) => {
    setLegendEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } as LegendEntry : e))
    );
  }, [setLegendEntries]);

  const deleteLegendEntry = useCallback((id: string) => {
    recordSnapshot();
    setLegendEntries((prev) => prev.filter((e) => e.id !== id));
    setFeatures((prev) =>
      prev.map((f) => (f.legendEntryId === id ? { ...f, legendEntryId: undefined } as FeatureData : f))
    );
  }, [setFeatures, setLegendEntries, recordSnapshot]);

  const assignLegendEntry = useCallback((featureId: string, legendEntryId: string | null) => {
    recordSnapshot();
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id !== featureId) return f;
        if (legendEntryId === null) {
          return { ...f, legendEntryId: undefined } as FeatureData;
        }
        return { ...f, legendEntryId, choroplethCategoryId: undefined } as FeatureData;
      })
    );
  }, [setFeatures, recordSnapshot]);

  const deduceLegendEntryFromFeature = useCallback((featureId: string, label: string) => {
    const feature = featuresRef.current!.find((f) => f.id === featureId);
    if (!feature) return;
    recordSnapshot();
    const entryData = extractLegendEntry(feature, label);
    const id = uuid();
    const order = Math.max(0, ...legendEntriesRef.current!.map((e) => e.order)) + 1;
    setLegendEntries((prev) => [...prev, { ...entryData, id, order } as LegendEntry]);
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, legendEntryId: id } as FeatureData : f))
    );
  }, [featuresRef, legendEntriesRef, setFeatures, setLegendEntries, recordSnapshot]);

  const reorderLegendEntries = useCallback((orderedIds: string[]) => {
    recordSnapshot();
    setLegendEntries((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]));
      return orderedIds
        .map((id, idx) => {
          const e = byId.get(id);
          return e ? { ...e, order: idx } as LegendEntry : null;
        })
        .filter((e): e is LegendEntry => e !== null);
    });
  }, [setLegendEntries, recordSnapshot]);

  return {
    addLegendEntry, updateLegendEntry, deleteLegendEntry,
    assignLegendEntry, deduceLegendEntryFromFeature,
    reorderLegendEntries,
  };
}
