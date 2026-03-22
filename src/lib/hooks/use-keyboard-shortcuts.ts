import { useEffect } from "react";
import type { DrawMode } from "../draw-engine";
import type { FeatureData } from "../types";

interface Deps {
  featuresRef: React.RefObject<FeatureData[]>;
  selectedIdsRef: React.RefObject<string[]>;
  drawModeRef: React.RefObject<DrawMode>;
  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>;
  setDrawMode: (mode: DrawMode) => void;
  duplicateFeature: (id: string) => void;
  duplicateGroup: (groupId: string) => void;
  deleteFeature: (id: string) => void;
  deleteGroup: (groupId: string) => void;
}

export function useKeyboardShortcuts({
  featuresRef, selectedIdsRef, drawModeRef,
  setSelectedFeatureIds, setDrawMode,
  duplicateFeature, duplicateGroup, deleteFeature, deleteGroup,
}: Deps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target;
      const inInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const ids = selectedIdsRef.current!;
        if (ids.length === 0) return;
        const first = featuresRef.current!.find((f) => f.id === ids[0]);
        if (ids.length > 1 && first?.groupId) {
          duplicateGroup(first.groupId);
        } else if (first) {
          duplicateFeature(first.id);
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !inInput) {
        const ids = selectedIdsRef.current!;
        if (ids.length === 0) return;
        const first = featuresRef.current!.find((f) => f.id === ids[0]);
        if (ids.length > 1 && first?.groupId) {
          deleteGroup(first.groupId);
        } else if (first) {
          deleteFeature(first.id);
        }
        return;
      }

      if (e.key === "Escape" && !inInput && drawModeRef.current === "select") {
        setSelectedFeatureIds([]);
        return;
      }

      if (inInput || mod || e.altKey) return;
      const modeMap: Record<string, DrawMode> = {
        v: "select", p: "polygon", l: "polyline", m: "point",
        r: "rectangle", c: "circle", t: "text",
      };
      const mode = modeMap[e.key.toLowerCase()];
      if (mode) {
        e.preventDefault();
        setDrawMode(mode);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [featuresRef, selectedIdsRef, drawModeRef, setSelectedFeatureIds, setDrawMode, duplicateFeature, duplicateGroup, deleteFeature, deleteGroup]);
}
