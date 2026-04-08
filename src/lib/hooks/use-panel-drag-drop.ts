import React, { useRef, useState, useCallback } from "react";
import type { FeatureData, GroupData } from "@/lib/types";

type SidebarItem =
  | { kind: "feature"; feature: FeatureData }
  | { kind: "group"; group: GroupData; children: FeatureData[] };

type DragRef = { id: string; kind: "feature" | "group" } | null;

interface PanelDragActions {
  reorderItems: (ids: { id: string; kind: "feature" | "group" }[]) => void;
  reorderGroupChildren: (groupId: string, childIds: string[]) => void;
  addFeatureToGroup: (featureId: string, groupId: string) => void;
  removeFeatureFromGroup: (featureId: string) => void;
}

export function usePanelDragDrop(
  items: SidebarItem[],
  features: FeatureData[],
  actions: PanelDragActions,
) {
  const [dragOverGap, setDragOverGap] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const draggedRef = useRef<DragRef>(null);

  const cleanup = useCallback(() => {
    draggedRef.current = null;
    setDragOverGap(null);
    setDragOverGroupId(null);
  }, []);

  function resolveGap(e: React.DragEvent, gapBefore: string, gapAfter: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    return e.clientY < midY ? gapBefore : gapAfter;
  }

  function dropTopLevel(insertIdx: number) {
    const dragged = draggedRef.current;
    if (!dragged) { cleanup(); return; }
    const draggedFeature = dragged.kind === "feature"
      ? features.find((f) => f.id === dragged.id)
      : null;
    if (draggedFeature?.groupId) {
      actions.removeFeatureFromGroup(draggedFeature.id);
    }
    const orderedIds = items.map((item): { id: string; kind: "feature" | "group" } =>
      item.kind === "group"
        ? { id: item.group.id, kind: "group" }
        : { id: item.feature.id, kind: "feature" },
    );
    const fromIdx = orderedIds.findIndex((o) => o.id === dragged.id);
    if (fromIdx !== -1) {
      orderedIds.splice(fromIdx, 1);
      const adj = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
      orderedIds.splice(adj, 0, dragged);
    } else {
      orderedIds.splice(insertIdx, 0, dragged);
    }
    actions.reorderItems(orderedIds);
    cleanup();
  }

  function dropChild(groupId: string, insertIdx: number) {
    const dragged = draggedRef.current;
    if (!dragged || dragged.kind !== "feature") { cleanup(); return; }
    const groupItem = items.find(
      (it) => it.kind === "group" && it.group.id === groupId,
    ) as { kind: "group"; group: GroupData; children: FeatureData[] } | undefined;
    if (!groupItem) { cleanup(); return; }
    const draggedIsInGroup = features.find((f) => f.id === dragged.id)?.groupId === groupId;
    if (!draggedIsInGroup) {
      actions.addFeatureToGroup(dragged.id, groupId);
    }
    const childIds = groupItem.children.map((c) => c.id);
    const fromIdx = childIds.indexOf(dragged.id);
    if (fromIdx !== -1) {
      childIds.splice(fromIdx, 1);
      const adj = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
      childIds.splice(adj, 0, dragged.id);
    } else {
      childIds.splice(insertIdx, 0, dragged.id);
    }
    actions.reorderGroupChildren(groupId, childIds);
    cleanup();
  }

  function dropAtGap(gapId: string) {
    if (gapId.startsWith("top-")) {
      dropTopLevel(parseInt(gapId.slice(4)));
    } else if (gapId.startsWith("child-")) {
      const rest = gapId.slice(6);
      const lastDash = rest.lastIndexOf("-");
      dropChild(rest.slice(0, lastDash), parseInt(rest.slice(lastDash + 1)));
    }
  }

  const startDrag = useCallback((id: string, kind: "feature" | "group") => {
    draggedRef.current = { id, kind };
  }, []);

  const onRowDragOver = useCallback(
    (e: React.DragEvent, gapBefore: string, gapAfter: string) => {
      e.preventDefault();
      if (!draggedRef.current) return;
      setDragOverGap(resolveGap(e, gapBefore, gapAfter));
      setDragOverGroupId(null);
    },
    [],
  );

  const onGroupDragOver = useCallback(
    (e: React.DragEvent, groupId: string, gapBefore: string, gapAfter: string) => {
      e.preventDefault();
      const dragged = draggedRef.current;
      if (!dragged || dragged.id === groupId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const inTopThird = e.clientY < rect.top + rect.height / 3;
      const inBottomThird = e.clientY > rect.top + (rect.height * 2) / 3;
      if (dragged.kind === "feature") {
        if (inTopThird) {
          setDragOverGap(gapBefore);
          setDragOverGroupId(null);
        } else if (inBottomThird) {
          setDragOverGap(gapAfter);
          setDragOverGroupId(null);
        } else {
          setDragOverGroupId(groupId);
          setDragOverGap(null);
        }
      } else {
        setDragOverGap(resolveGap(e, gapBefore, gapAfter));
        setDragOverGroupId(null);
      }
    },
    [],
  );

  const onRowDrop = useCallback(
    (e: React.DragEvent, gapBefore: string, gapAfter: string) => {
      dropAtGap(resolveGap(e, gapBefore, gapAfter));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, features],
  );

  const onGroupHeaderDrop = useCallback(
    (e: React.DragEvent, groupId: string, gapBefore: string, gapAfter: string) => {
      const dragged = draggedRef.current;
      if (!dragged) { cleanup(); return; }
      if (dragged.kind === "feature") {
        const rect = e.currentTarget.getBoundingClientRect();
        const inTopThird = e.clientY < rect.top + rect.height / 3;
        const inBottomThird = e.clientY > rect.top + (rect.height * 2) / 3;
        if (inTopThird) {
          dropAtGap(gapBefore);
        } else if (inBottomThird) {
          dropAtGap(gapAfter);
        } else {
          actions.addFeatureToGroup(dragged.id, groupId);
          cleanup();
        }
      } else {
        dropAtGap(resolveGap(e, gapBefore, gapAfter));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, features],
  );

  const onTailDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedRef.current) {
        setDragOverGap(`top-${items.length}`);
        setDragOverGroupId(null);
      }
    },
    [items.length],
  );

  const onTailDrop = useCallback(
    () => dropTopLevel(items.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, features],
  );

  const onContainerDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (e.currentTarget === e.target) {
        setDragOverGap(null);
        setDragOverGroupId(null);
      }
    },
    [],
  );

  return {
    dragOverGap,
    dragOverGroupId,
    startDrag,
    cleanup,
    onRowDragOver,
    onGroupDragOver,
    onRowDrop,
    onGroupHeaderDrop,
    onTailDragOver,
    onTailDrop,
    onContainerDragLeave,
  };
}
