"use client";

import { useMemo, useRef, useState } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import type { FeatureData, GroupData } from "@/lib/types";
import { FeatureSwatch } from "@/components/ui/feature-swatch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaTrash, FaCopy } from "react-icons/fa6";

type SidebarItem =
  | { kind: "feature"; feature: FeatureData }
  | { kind: "group"; group: GroupData; children: FeatureData[] };

export default function FeaturePanel() {
  const { features, groups, selectedFeatureIds, featureLimitReached } = useEditorData();
  const {
    selectFeature, selectFeatures, reorderItems, reorderGroupChildren,
    createGroup, updateGroup, addFeatureToGroup, removeFeatureFromGroup,
    duplicateFeature, duplicateGroup, deleteFeature, deleteGroup, clearAllFeatures,
  } = useEditorActions();
  const [dragOverGap, setDragOverGap] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const draggedRef = useRef<{ id: string; kind: "feature" | "group" } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const selectedSet = useMemo(() => new Set(selectedFeatureIds), [selectedFeatureIds]);

  const items = useMemo(() => {
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const groupChildren = new Map<string, FeatureData[]>();
    const standalone: FeatureData[] = [];

    for (const f of features) {
      if (f.groupId && groupMap.has(f.groupId)) {
        let arr = groupChildren.get(f.groupId);
        if (!arr) { arr = []; groupChildren.set(f.groupId, arr); }
        arr.push(f);
      } else {
        standalone.push(f);
      }
    }

    Array.from(groupChildren.values()).forEach((arr) => {
      arr.sort((a: FeatureData, b: FeatureData) => a.order - b.order);
    });

    const mixed: { order: number; item: SidebarItem }[] = [];

    for (const f of standalone) {
      mixed.push({ order: f.order, item: { kind: "feature", feature: f } });
    }
    for (const g of groups) {
      const children = groupChildren.get(g.id) ?? [];
      mixed.push({ order: g.order, item: { kind: "group", group: g, children } });
    }
    mixed.sort((a, b) => a.order - b.order);
    return mixed.map((m) => m.item);
  }, [features, groups]);

  function handleDragStart(id: string, kind: "feature" | "group") {
    draggedRef.current = { id, kind };
  }

  function resolveGap(e: React.DragEvent, gapBefore: string, gapAfter: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    return e.clientY < midY ? gapBefore : gapAfter;
  }

  function handleRowDragOver(e: React.DragEvent, gapBefore: string, gapAfter: string) {
    e.preventDefault();
    if (!draggedRef.current) return;
    const gap = resolveGap(e, gapBefore, gapAfter);
    setDragOverGap(gap);
    setDragOverGroupId(null);
  }

  function handleGroupDragOver(e: React.DragEvent, groupId: string, gapBefore: string, gapAfter: string) {
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
      const gap = resolveGap(e, gapBefore, gapAfter);
      setDragOverGap(gap);
      setDragOverGroupId(null);
    }
  }

  function dropAtGap(gapId: string) {
    if (gapId.startsWith("top-")) {
      const insertIdx = parseInt(gapId.slice(4));
      dropTopLevel(insertIdx);
    } else if (gapId.startsWith("child-")) {
      const rest = gapId.slice(6);
      const lastDash = rest.lastIndexOf("-");
      const groupId = rest.slice(0, lastDash);
      const insertIdx = parseInt(rest.slice(lastDash + 1));
      dropChild(groupId, insertIdx);
    }
  }

  function handleRowDrop(gapBefore: string, gapAfter: string, e: React.DragEvent) {
    const gap = resolveGap(e, gapBefore, gapAfter);
    dropAtGap(gap);
  }

  function handleGroupHeaderDrop(groupId: string, gapBefore: string, gapAfter: string, e: React.DragEvent) {
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
        addFeatureToGroup(dragged.id, groupId);
        cleanup();
      }
    } else {
      const gap = resolveGap(e, gapBefore, gapAfter);
      dropAtGap(gap);
    }
  }

  function dropTopLevel(insertIdx: number) {
    const dragged = draggedRef.current;
    if (!dragged) { cleanup(); return; }
    const draggedFeature = dragged.kind === "feature"
      ? features.find((f) => f.id === dragged.id)
      : null;
    if (draggedFeature?.groupId) {
      removeFeatureFromGroup(draggedFeature.id);
    }
    const orderedIds = items.map((item): { id: string; kind: "feature" | "group" } =>
      item.kind === "group"
        ? { id: item.group.id, kind: "group" }
        : { id: item.feature.id, kind: "feature" }
    );
    const fromIdx = orderedIds.findIndex((o) => o.id === dragged.id);
    if (fromIdx !== -1) {
      orderedIds.splice(fromIdx, 1);
      const adj = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
      orderedIds.splice(adj, 0, dragged);
    } else {
      orderedIds.splice(insertIdx, 0, dragged);
    }
    reorderItems(orderedIds);
    cleanup();
  }

  function dropChild(groupId: string, insertIdx: number) {
    const dragged = draggedRef.current;
    if (!dragged || dragged.kind !== "feature") { cleanup(); return; }
    const groupItem = items.find((it) => it.kind === "group" && it.group.id === groupId) as
      | { kind: "group"; group: GroupData; children: FeatureData[] }
      | undefined;
    if (!groupItem) { cleanup(); return; }
    const draggedIsInGroup = features.find((f) => f.id === dragged.id)?.groupId === groupId;
    if (!draggedIsInGroup) {
      addFeatureToGroup(dragged.id, groupId);
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
    reorderGroupChildren(groupId, childIds);
    cleanup();
  }

  function cleanup() {
    draggedRef.current = null;
    setDragOverGap(null);
    setDragOverGroupId(null);
  }

  function toggleCollapsed(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function handleGroupClick(children: FeatureData[]) {
    if (children.length > 0) {
      selectFeatures(children.map((f) => f.id));
    }
  }

  function handleAddGroup() {
    createGroup([], "New group");
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Features</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleAddGroup}
            title="Add group"
          >
            +
          </Button>
          {features.length > 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={clearAllFeatures}
              title="Clear all features"
            >
              <FaTrash className="w-3 h-3" />
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{features.length}</span>
        </div>
      </div>
      {featureLimitReached && (
        <p className="px-3 py-1.5 text-xs text-destructive bg-destructive/10 border-b">
          Feature limit reached ({features.length}). Delete features to add more.
        </p>
      )}
      {features.length === 0 && groups.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground text-center">
          No features yet. Draw something on the map.
        </p>
      ) : (
        <div className="overflow-y-auto flex-1" onDragLeave={(e) => { if (e.currentTarget === e.target) { setDragOverGap(null); setDragOverGroupId(null); } }}>
          {items.map((item, i) => {
            if (item.kind === "group") {
              const gid = item.group.id;
              const isCollapsed = collapsed.has(gid);
              const hasSelectedChild = item.children.some((c) => selectedSet.has(c.id));
              const isDropTarget = dragOverGroupId === gid;
              return (
                <div key={gid}>
                  {dragOverGap === `top-${i}` && <DropBar />}
                  <GroupRow
                    group={item.group}
                    childCount={item.children.length}
                    isCollapsed={isCollapsed}
                    isSelected={hasSelectedChild}
                    isDropTarget={isDropTarget}
                    onToggle={() => toggleCollapsed(gid)}
                    onClick={() => handleGroupClick(item.children)}
                    onDuplicate={() => duplicateGroup(gid)}
                    onDelete={() => deleteGroup(gid)}
                    onRename={(label) => updateGroup(gid, { label })}
                    onDragStart={() => handleDragStart(gid, "group")}
                    onDragOver={(e) => handleGroupDragOver(e, gid, `top-${i}`, `top-${i + 1}`)}
                    onDrop={(e) => handleGroupHeaderDrop(gid, `top-${i}`, `top-${i + 1}`, e)}
                    onDragEnd={cleanup}
                  />
                  {!isCollapsed && item.children.map((child, ci) => (
                    <div key={child.id}>
                      {dragOverGap === `child-${gid}-${ci}` && <DropBar indent />}
                      <FeatureRow
                        feature={child}
                        isSelected={selectedSet.has(child.id)}
                        indent
                        onSelect={() => selectFeature(child.id)}
                        onDuplicate={() => duplicateFeature(child.id)}
                        onDelete={() => deleteFeature(child.id)}
                        onDragStart={() => handleDragStart(child.id, "feature")}
                        onDragOver={(e) => handleRowDragOver(e, `child-${gid}-${ci}`, `child-${gid}-${ci + 1}`)}
                        onDrop={(e) => handleRowDrop(`child-${gid}-${ci}`, `child-${gid}-${ci + 1}`, e)}
                        onDragEnd={cleanup}
                      />
                    </div>
                  ))}
                  {!isCollapsed && dragOverGap === `child-${gid}-${item.children.length}` && <DropBar indent />}
                </div>
              );
            }
            return (
              <div key={item.feature.id}>
                {dragOverGap === `top-${i}` && <DropBar />}
                <FeatureRow
                  feature={item.feature}
                  isSelected={selectedSet.has(item.feature.id)}
                  onSelect={() => selectFeature(item.feature.id)}
                  onDuplicate={() => duplicateFeature(item.feature.id)}
                  onDelete={() => deleteFeature(item.feature.id)}
                  onDragStart={() => handleDragStart(item.feature.id, "feature")}
                  onDragOver={(e) => handleRowDragOver(e, `top-${i}`, `top-${i + 1}`)}
                  onDrop={(e) => handleRowDrop(`top-${i}`, `top-${i + 1}`, e)}
                  onDragEnd={cleanup}
                />
              </div>
            );
          })}
          {dragOverGap === `top-${items.length}` && <DropBar />}
          <div
            className="flex-1 min-h-8"
            onDragOver={(e) => { e.preventDefault(); if (draggedRef.current) { setDragOverGap(`top-${items.length}`); setDragOverGroupId(null); } }}
            onDrop={() => dropTopLevel(items.length)}
          />
        </div>
      )}
    </div>
  );
}

function DropBar({ indent }: { indent?: boolean }) {
  return <div className={`h-0.5 bg-primary ${indent ? "ml-6" : ""}`} />;
}

function GroupRow({
  group,
  childCount,
  isCollapsed,
  isSelected,
  isDropTarget,
  onToggle,
  onClick,
  onDuplicate,
  onDelete,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  group: GroupData;
  childCount: number;
  isCollapsed: boolean;
  isSelected: boolean;
  isDropTarget: boolean;
  onToggle: () => void;
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (label: string) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(group.label);

  function startRename(e: React.MouseEvent) {
    e.stopPropagation();
    setEditValue(group.label);
    setEditing(true);
  }

  function commitRename() {
    onRename(editValue.trim() || "Group");
    setEditing(false);
  }

  return (
    <div
      draggable={!editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 cursor-grab text-sm border-b font-medium ${
        isDropTarget ? "bg-primary/10 border-b-2 border-b-primary" : ""
      } ${isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground"}`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="text-xs text-muted-foreground shrink-0 w-4"
      >
        {isCollapsed ? "▸" : "▾"}
      </button>
      {editing ? (
        <Input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
          onClick={(e) => e.stopPropagation()}
          className="h-5 text-sm px-1 py-0 flex-1"
        />
      ) : (
        <span className="flex-1 truncate" onDoubleClick={startRename}>
          {group.label || <span className="text-muted-foreground italic">Group</span>}
        </span>
      )}
      <span className="text-[10px] text-muted-foreground">{childCount}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        className="text-muted-foreground hover:text-foreground shrink-0 p-1.5"
        title="Duplicate group"
      >
        <FaCopy className="w-3 h-3" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-muted-foreground hover:text-destructive shrink-0 p-1.5"
        title="Delete group"
      >
        <FaTrash className="w-3 h-3" />
      </button>
    </div>
  );
}

function FeatureRow({
  feature,
  isSelected,
  indent,
  onSelect,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  feature: FeatureData;
  isSelected: boolean;
  indent?: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`group/row flex items-center gap-2 py-1.5 cursor-grab text-sm border-b last:border-b-0 ${
        indent ? "pl-6 pr-3" : "px-3"
      } ${isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground"
      }`}
    >
      <FeatureSwatch feature={feature} width={44} height={28} />
      <span className="flex-1 truncate">
        {feature.label || <span className="text-muted-foreground italic">Untitled</span>}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        className="text-muted-foreground hover:text-foreground shrink-0 p-1.5"
        title="Duplicate feature"
      >
        <FaCopy className="w-3 h-3" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-muted-foreground hover:text-destructive shrink-0 p-1.5"
        title="Delete feature"
      >
        <FaTrash className="w-3 h-3" />
      </button>
    </div>
  );
}
