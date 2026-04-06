import { useCallback, useEffect, useRef, useState } from "react";
import type { FeatureData, GroupData, LegendEntry } from "@/lib/types";

type Snapshot = { features: FeatureData[]; groups: GroupData[]; legendEntries: LegendEntry[] };
type Ref<T> = { current: T };

const HISTORY_LIMIT = 50;

export function useUndoRedo(
  featuresRef: Ref<FeatureData[]>,
  groupsRef: Ref<GroupData[]>,
  legendEntriesRef: Ref<LegendEntry[]>,
  setFeatures: React.Dispatch<React.SetStateAction<FeatureData[]>>,
  setGroups: React.Dispatch<React.SetStateAction<GroupData[]>>,
  setLegendEntries: React.Dispatch<React.SetStateAction<LegendEntry[]>>,
  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>,
) {
  const historyRef = useRef<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  const recordSnapshot = useCallback(() => {
    const h = historyRef.current;
    h.past.push({ features: featuresRef.current, groups: groupsRef.current, legendEntries: legendEntriesRef.current });
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    syncFlags();
  }, [featuresRef, groupsRef, legendEntriesRef, syncFlags]);

  const undo = useCallback(() => {
    const h = historyRef.current;
    const snap = h.past.pop();
    if (!snap) return;
    h.future.push({ features: featuresRef.current, groups: groupsRef.current, legendEntries: legendEntriesRef.current });
    setFeatures(snap.features);
    setGroups(snap.groups);
    setLegendEntries(snap.legendEntries);
    setSelectedFeatureIds([]);
    syncFlags();
  }, [featuresRef, groupsRef, legendEntriesRef, setFeatures, setGroups, setLegendEntries, setSelectedFeatureIds, syncFlags]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    const snap = h.future.pop();
    if (!snap) return;
    h.past.push({ features: featuresRef.current, groups: groupsRef.current, legendEntries: legendEntriesRef.current });
    setFeatures(snap.features);
    setGroups(snap.groups);
    setLegendEntries(snap.legendEntries);
    setSelectedFeatureIds([]);
    syncFlags();
  }, [featuresRef, groupsRef, legendEntriesRef, setFeatures, setGroups, setLegendEntries, setSelectedFeatureIds, syncFlags]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return { canUndo, canRedo, recordSnapshot, undo, redo };
}
