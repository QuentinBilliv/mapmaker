import { useCallback, useEffect, useRef, useState } from "react";
import type { FeatureData, GroupData, LegendEntry, ChoroplethData } from "@/lib/types";

type Snapshot = { features: FeatureData[]; groups: GroupData[]; legendEntries: LegendEntry[]; choropleth: ChoroplethData };
type Ref<T> = { current: T };

const HISTORY_LIMIT = 50;

export function useUndoRedo(
  featuresRef: Ref<FeatureData[]>,
  groupsRef: Ref<GroupData[]>,
  legendEntriesRef: Ref<LegendEntry[]>,
  choroplethRef: Ref<ChoroplethData>,
  setFeatures: React.Dispatch<React.SetStateAction<FeatureData[]>>,
  setGroups: React.Dispatch<React.SetStateAction<GroupData[]>>,
  setLegendEntries: React.Dispatch<React.SetStateAction<LegendEntry[]>>,
  setChoropleth: React.Dispatch<React.SetStateAction<ChoroplethData>>,
  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>,
) {
  const historyRef = useRef<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  const snap = useCallback((): Snapshot => ({
    features: featuresRef.current, groups: groupsRef.current,
    legendEntries: legendEntriesRef.current, choropleth: choroplethRef.current,
  }), [featuresRef, groupsRef, legendEntriesRef, choroplethRef]);

  const applySnap = useCallback((s: Snapshot) => {
    setFeatures(s.features);
    setGroups(s.groups);
    setLegendEntries(s.legendEntries);
    setChoropleth(s.choropleth);
    setSelectedFeatureIds([]);
  }, [setFeatures, setGroups, setLegendEntries, setChoropleth, setSelectedFeatureIds]);

  const recordSnapshot = useCallback(() => {
    const h = historyRef.current;
    h.past.push(snap());
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    syncFlags();
  }, [snap, syncFlags]);

  const undo = useCallback(() => {
    const h = historyRef.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(snap());
    applySnap(prev);
    syncFlags();
  }, [snap, applySnap, syncFlags]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(snap());
    applySnap(next);
    syncFlags();
  }, [snap, applySnap, syncFlags]);

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
