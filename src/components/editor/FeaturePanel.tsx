"use client";

import { useMemo, useRef, useState } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import type { FeatureData, GroupData } from "@/lib/types";
import { ShapePreview } from "@/components/ui/marker-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function FeatureIcon({ feature }: { feature: FeatureData }) {
  if (feature.type === "text") {
    return (
      <span className="text-xs font-bold shrink-0" style={{ color: feature.color }}>
        T
      </span>
    );
  }
  if (feature.type === "point" && feature.shape) {
    return (
      <span className="shrink-0" style={{ color: feature.color }}>
        <ShapePreview shape={feature.shape} />
      </span>
    );
  }
  let icon = "⬡";
  if (feature.type === "polyline") {
    if (feature.arrowStyle === "both") icon = "↔";
    else if (feature.arrowStyle === "forward") icon = "→";
    else icon = "╱";
  }
  return (
    <span className="text-xs shrink-0" style={{ color: feature.color }}>
      {icon}
    </span>
  );
}

type SidebarItem =
  | { kind: "feature"; feature: FeatureData }
  | { kind: "group"; group: GroupData; children: FeatureData[] };

export default function FeaturePanel() {
  const { features, layers, groups, selectedFeatureIds } = useEditorData();
  const {
    selectFeature, selectFeatures, reorderItems, dissolveGroup,
    createGroup, updateGroup, addFeatureToGroup, removeFeatureFromGroup,
  } = useEditorActions();
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const draggedRef = useRef<{ id: string; kind: "feature" | "group" } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const layerMap = new Map(layers.map((l) => [l.id, l]));
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

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (draggedRef.current && draggedRef.current.id !== id) {
      setDragOverId(id);
      setDragOverGroupId(null);
    }
  }

  function handleGroupDragOver(e: React.DragEvent, groupId: string) {
    e.preventDefault();
    const dragged = draggedRef.current;
    if (!dragged) return;
    if (dragged.kind === "feature" && dragged.id !== groupId) {
      setDragOverGroupId(groupId);
      setDragOverId(null);
    }
  }

  function handleGroupDrop(groupId: string) {
    const dragged = draggedRef.current;
    if (!dragged || dragged.kind !== "feature") { cleanup(); return; }
    addFeatureToGroup(dragged.id, groupId);
    cleanup();
  }

  function handleDrop(targetId: string) {
    const dragged = draggedRef.current;
    if (!dragged || dragged.id === targetId) { cleanup(); return; }

    const orderedIds = items.map((item): { id: string; kind: "feature" | "group" } =>
      item.kind === "group"
        ? { id: item.group.id, kind: "group" }
        : { id: item.feature.id, kind: "feature" }
    );

    const fromIdx = orderedIds.findIndex((o) => o.id === dragged.id);
    const toIdx = orderedIds.findIndex((o) => o.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { cleanup(); return; }
    orderedIds.splice(fromIdx, 1);
    orderedIds.splice(toIdx, 0, dragged);
    reorderItems(orderedIds);
    cleanup();
  }

  function cleanup() {
    draggedRef.current = null;
    setDragOverId(null);
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
          <span className="text-xs text-muted-foreground">{features.length}</span>
        </div>
      </div>
      {features.length === 0 && groups.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground text-center">
          No features yet. Draw something on the map.
        </p>
      ) : (
        <div className="overflow-y-auto flex-1">
          {items.map((item) => {
            if (item.kind === "group") {
              const isCollapsed = collapsed.has(item.group.id);
              const hasSelectedChild = item.children.some((c) => selectedSet.has(c.id));
              const isDropTarget = dragOverGroupId === item.group.id;
              return (
                <div key={item.group.id}>
                  <GroupRow
                    group={item.group}
                    childCount={item.children.length}
                    isCollapsed={isCollapsed}
                    isSelected={hasSelectedChild}
                    isDropTarget={isDropTarget}
                    isDragOver={dragOverId === item.group.id}
                    onToggle={() => toggleCollapsed(item.group.id)}
                    onClick={() => handleGroupClick(item.children)}
                    onDissolve={() => dissolveGroup(item.group.id)}
                    onRename={(label) => updateGroup(item.group.id, { label })}
                    onDragStart={() => handleDragStart(item.group.id, "group")}
                    onDragOver={(e) => handleGroupDragOver(e, item.group.id)}
                    onDrop={() => handleGroupDrop(item.group.id)}
                    onDragEnd={cleanup}
                  />
                  {!isCollapsed && item.children.map((child) => (
                    <FeatureRow
                      key={child.id}
                      feature={child}
                      layerName={layerMap.get(child.layerId)?.name}
                      isSelected={selectedSet.has(child.id)}
                      isDragOver={dragOverId === child.id}
                      indent
                      onSelect={() => selectFeature(child.id)}
                      onRemoveFromGroup={() => removeFeatureFromGroup(child.id)}
                      onDragStart={() => handleDragStart(child.id, "feature")}
                      onDragOver={(e) => handleDragOver(e, child.id)}
                      onDrop={() => handleDrop(child.id)}
                      onDragEnd={cleanup}
                    />
                  ))}
                </div>
              );
            }
            return (
              <FeatureRow
                key={item.feature.id}
                feature={item.feature}
                layerName={layerMap.get(item.feature.layerId)?.name}
                isSelected={selectedSet.has(item.feature.id)}
                isDragOver={dragOverId === item.feature.id}
                onSelect={() => selectFeature(item.feature.id)}
                onDragStart={() => handleDragStart(item.feature.id, "feature")}
                onDragOver={(e) => handleDragOver(e, item.feature.id)}
                onDrop={() => handleDrop(item.feature.id)}
                onDragEnd={cleanup}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroupRow({
  group,
  childCount,
  isCollapsed,
  isSelected,
  isDropTarget,
  isDragOver,
  onToggle,
  onClick,
  onDissolve,
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
  isDragOver: boolean;
  onToggle: () => void;
  onClick: () => void;
  onDissolve: () => void;
  onRename: (label: string) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
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
      } ${isDragOver ? "border-t-2 border-t-primary" : ""
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
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={(e) => { e.stopPropagation(); onDissolve(); }}
        title="Ungroup"
        className="shrink-0 h-5 w-5"
      >
        ✕
      </Button>
    </div>
  );
}

function FeatureRow({
  feature,
  layerName,
  isSelected,
  isDragOver,
  indent,
  onSelect,
  onRemoveFromGroup,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  feature: FeatureData;
  layerName?: string;
  isSelected: boolean;
  isDragOver: boolean;
  indent?: boolean;
  onSelect: () => void;
  onRemoveFromGroup?: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
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
      className={`flex items-center gap-2 py-1.5 cursor-grab text-sm border-b last:border-b-0 ${
        indent ? "pl-6 pr-3" : "px-3"
      } ${isDragOver ? "border-t-2 border-t-primary" : ""} ${
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground"
      }`}
    >
      <FeatureIcon feature={feature} />
      <span className="flex-1 truncate">
        {feature.label || <span className="text-muted-foreground italic">Untitled</span>}
      </span>
      {onRemoveFromGroup && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveFromGroup(); }}
          className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"
          title="Remove from group"
        >
          ✕
        </button>
      )}
      {layerName && !onRemoveFromGroup && (
        <span className="text-[10px] text-muted-foreground truncate max-w-16">
          {layerName}
        </span>
      )}
    </div>
  );
}
