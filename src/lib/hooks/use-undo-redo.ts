import { useCallback, useEffect, useRef, useState } from "react";
import type { FeatureData, LayerData, GroupData } from "@/lib/types";

type Snapshot = { features: FeatureData[]; layers: LayerData[]; groups: GroupData[] };
type Ref<T> = { current: T };

const HISTORY_LIMIT = 50;

export function useUndoRedo(
  featuresRef: Ref<FeatureData[]>,
  layersRef: Ref<LayerData[]>,
  groupsRef: Ref<GroupData[]>,
  setFeatures: React.Dispatch<React.SetStateAction<FeatureData[]>>,
  setLayers: React.Dispatch<React.SetStateAction<LayerData[]>>,
  setGroups: React.Dispatch<React.SetStateAction<GroupData[]>>,
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
    h.past.push({ features: featuresRef.current, layers: layersRef.current, groups: groupsRef.current });
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    syncFlags();
  }, [featuresRef, layersRef, groupsRef, syncFlags]);

  const undo = useCallback(() => {
    const h = historyRef.current;
    const snap = h.past.pop();
    if (!snap) return;
    h.future.push({ features: featuresRef.current, layers: layersRef.current, groups: groupsRef.current });
    setFeatures(snap.features);
    setLayers(snap.layers);
    setGroups(snap.groups);
    setSelectedFeatureIds([]);
    syncFlags();
  }, [featuresRef, layersRef, groupsRef, setFeatures, setLayers, setGroups, setSelectedFeatureIds, syncFlags]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    const snap = h.future.pop();
    if (!snap) return;
    h.past.push({ features: featuresRef.current, layers: layersRef.current, groups: groupsRef.current });
    setFeatures(snap.features);
    setLayers(snap.layers);
    setGroups(snap.groups);
    setSelectedFeatureIds([]);
    syncFlags();
  }, [featuresRef, layersRef, groupsRef, setFeatures, setLayers, setGroups, setSelectedFeatureIds, syncFlags]);

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
