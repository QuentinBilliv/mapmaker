import { useCallback } from "react";
import { v4 as uuid } from "uuid";
import { nextOrder, shiftGeometry, rotateGeometry } from "../geometry-transforms";
import { type Coord } from "../geo-math";
import type { FeatureData, GroupData } from "../types";

const DUPLICATE_OFFSET_LNG = 0.005;
const DUPLICATE_OFFSET_MERC_Y = 0.005;

interface Deps {
  featuresRef: React.RefObject<FeatureData[]>;
  groupsRef: React.RefObject<GroupData[]>;
  setFeatures: React.Dispatch<React.SetStateAction<FeatureData[]>>;
  setGroups: React.Dispatch<React.SetStateAction<GroupData[]>>;
  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>;
  recordSnapshot: () => void;
  featureLimit: number;
}

export function useGroupActions({
  featuresRef, groupsRef,
  setFeatures, setGroups, setSelectedFeatureIds,
  recordSnapshot, featureLimit,
}: Deps) {
  const createGroup = useCallback((featureIds: string[], label: string) => {
    recordSnapshot();
    const groupId = uuid();
    const groupOrder = Math.max(nextOrder(groupsRef.current!), nextOrder(featuresRef.current!));
    setGroups((prev) => [...prev, { id: groupId, label, order: groupOrder }]);
    setFeatures((prev) =>
      prev.map((f) => featureIds.includes(f.id) ? { ...f, groupId } as FeatureData : f)
    );
  }, [featuresRef, groupsRef, setFeatures, setGroups, recordSnapshot]);

  const dissolveGroup = useCallback((groupId: string) => {
    recordSnapshot();
    setFeatures((prev) =>
      prev.map((f) => f.groupId === groupId ? { ...f, groupId: undefined } as FeatureData : f)
    );
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, [setFeatures, setGroups, recordSnapshot]);

  const updateGroup = useCallback((id: string, updates: Partial<GroupData>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }, [setGroups]);

  const duplicateGroup = useCallback((groupId: string) => {
    const groupChildren = featuresRef.current!.filter((f) => f.groupId === groupId);
    if (featureLimit !== Infinity && featuresRef.current!.length + groupChildren.length > featureLimit) return;
    recordSnapshot();
    const group = groupsRef.current!.find((g) => g.id === groupId);
    if (!group) return;
    const newGroupId = uuid();
    const groupOrder = Math.max(nextOrder(groupsRef.current!), nextOrder(featuresRef.current!));
    setGroups((prev) => [...prev, { id: newGroupId, label: group.label, order: groupOrder }]);
    const clones = groupChildren.map((f, i) => ({
      ...structuredClone(f),
      id: uuid(),
      groupId: newGroupId,
      order: i,
      geometry: shiftGeometry(f.geometry, DUPLICATE_OFFSET_LNG, DUPLICATE_OFFSET_MERC_Y),
    } as FeatureData));
    setFeatures((prev) => [...prev, ...clones]);
    setSelectedFeatureIds(clones.map((c) => c.id));
  }, [featuresRef, groupsRef, setFeatures, setGroups, setSelectedFeatureIds, recordSnapshot, featureLimit]);

  const deleteGroup = useCallback((groupId: string) => {
    recordSnapshot();
    setFeatures((prev) => prev.filter((f) => f.groupId !== groupId));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setSelectedFeatureIds([]);
  }, [setFeatures, setGroups, setSelectedFeatureIds, recordSnapshot]);

  const reorderItems = useCallback((orderedIds: { id: string; kind: "feature" | "group" }[]) => {
    recordSnapshot();
    let order = 0;
    const groupOrderMap = new Map<string, number>();
    const featureOrderMap = new Map<string, number>();
    for (const item of orderedIds) {
      if (item.kind === "group") groupOrderMap.set(item.id, order);
      else featureOrderMap.set(item.id, order);
      order++;
    }
    setGroups((prev) =>
      prev.map((g) => {
        const newOrder = groupOrderMap.get(g.id);
        return newOrder !== undefined ? { ...g, order: newOrder } : g;
      })
    );
    setFeatures((prev) =>
      prev.map((f) => {
        const newOrder = featureOrderMap.get(f.id);
        return newOrder !== undefined ? { ...f, order: newOrder } as FeatureData : f;
      })
    );
  }, [setFeatures, setGroups, recordSnapshot]);

  const reorderGroupChildren = useCallback((groupId: string, orderedChildIds: string[]) => {
    recordSnapshot();
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.groupId !== groupId) return f;
        const idx = orderedChildIds.indexOf(f.id);
        return idx === -1 ? f : { ...f, order: idx } as FeatureData;
      })
    );
  }, [setFeatures, recordSnapshot]);

  const addFeatureToGroup = useCallback((featureId: string, groupId: string) => {
    recordSnapshot();
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, groupId } as FeatureData : f))
    );
  }, [setFeatures, recordSnapshot]);

  const removeFeatureFromGroup = useCallback((featureId: string) => {
    recordSnapshot();
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, groupId: undefined } as FeatureData : f))
    );
  }, [setFeatures, recordSnapshot]);

  const moveGroup = useCallback((groupId: string, dlng: number, dMercY: number) => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.groupId !== groupId) return f;
        return { ...f, geometry: shiftGeometry(f.geometry, dlng, dMercY) } as FeatureData;
      })
    );
  }, [setFeatures]);

  const rotateGroup = useCallback((groupId: string, deltaAngle: number, center: [number, number]) => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.groupId !== groupId) return f;
        return { ...f, geometry: rotateGeometry(f.geometry, center as Coord, deltaAngle) } as FeatureData;
      })
    );
  }, [setFeatures]);

  return {
    createGroup, dissolveGroup, updateGroup,
    duplicateGroup, deleteGroup,
    reorderItems, reorderGroupChildren,
    addFeatureToGroup, removeFeatureFromGroup,
    moveGroup, rotateGroup,
  };
}
