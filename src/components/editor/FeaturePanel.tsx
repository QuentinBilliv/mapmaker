"use client";

import React, { useMemo, useState } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import type { FeatureData, GroupData, LegendEntry } from "@/lib/types";
import { FeatureSwatch } from "@/components/ui/feature-swatch";
import { resolveFeatureStyle } from "@/lib/resolve-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaTrash, FaCopy } from "react-icons/fa6";
import { usePanelDragDrop } from "@/lib/hooks/use-panel-drag-drop";

type SidebarItem =
  | { kind: "feature"; feature: FeatureData }
  | { kind: "group"; group: GroupData; children: FeatureData[] };

export default function FeaturePanel() {
  const { features, groups, legendEntries, selectedFeatureIds, featureLimitReached } = useEditorData();
  const {
    selectFeature, selectFeatures, reorderItems, reorderGroupChildren,
    createGroup, updateGroup, addFeatureToGroup, removeFeatureFromGroup,
    duplicateFeature, duplicateGroup, deleteFeature, deleteGroup, clearAllFeatures,
  } = useEditorActions();
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

  const drag = usePanelDragDrop(items, features, {
    reorderItems,
    reorderGroupChildren,
    addFeatureToGroup,
    removeFeatureFromGroup,
  });

  function toggleCollapsed(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Features</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => createGroup([], "New group")}
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
        <div className="overflow-y-auto flex-1" onDragLeave={drag.onContainerDragLeave}>
          {items.map((item, i) => {
            if (item.kind === "group") {
              const gid = item.group.id;
              const isCollapsed = collapsed.has(gid);
              return (
                <div key={gid}>
                  {drag.dragOverGap === `top-${i}` && <DropBar />}
                  <GroupRow
                    group={item.group}
                    childCount={item.children.length}
                    isCollapsed={isCollapsed}
                    isSelected={item.children.some((c) => selectedSet.has(c.id))}
                    isDropTarget={drag.dragOverGroupId === gid}
                    onToggle={() => toggleCollapsed(gid)}
                    onClick={() => item.children.length > 0 && selectFeatures(item.children.map((f) => f.id))}
                    onDuplicate={() => duplicateGroup(gid)}
                    onDelete={() => deleteGroup(gid)}
                    onRename={(label) => updateGroup(gid, { label })}
                    onDragStart={() => drag.startDrag(gid, "group")}
                    onDragOver={(e) => drag.onGroupDragOver(e, gid, `top-${i}`, `top-${i + 1}`)}
                    onDrop={(e) => drag.onGroupHeaderDrop(e, gid, `top-${i}`, `top-${i + 1}`)}
                    onDragEnd={drag.cleanup}
                  />
                  {!isCollapsed && item.children.map((child, ci) => (
                    <div key={child.id}>
                      {drag.dragOverGap === `child-${gid}-${ci}` && <DropBar indent />}
                      <FeatureRow
                        feature={child}
                        isSelected={selectedSet.has(child.id)}
                        indent
                        legendEntries={legendEntries}
                        onSelect={() => selectFeature(child.id)}
                        onDuplicate={() => duplicateFeature(child.id)}
                        onDelete={() => deleteFeature(child.id)}
                        onDragStart={() => drag.startDrag(child.id, "feature")}
                        onDragOver={(e) => drag.onRowDragOver(e, `child-${gid}-${ci}`, `child-${gid}-${ci + 1}`)}
                        onDrop={(e) => drag.onRowDrop(e, `child-${gid}-${ci}`, `child-${gid}-${ci + 1}`)}
                        onDragEnd={drag.cleanup}
                      />
                    </div>
                  ))}
                  {!isCollapsed && drag.dragOverGap === `child-${gid}-${item.children.length}` && <DropBar indent />}
                </div>
              );
            }
            return (
              <div key={item.feature.id}>
                {drag.dragOverGap === `top-${i}` && <DropBar />}
                <FeatureRow
                  feature={item.feature}
                  isSelected={selectedSet.has(item.feature.id)}
                  legendEntries={legendEntries}
                  onSelect={() => selectFeature(item.feature.id)}
                  onDuplicate={() => duplicateFeature(item.feature.id)}
                  onDelete={() => deleteFeature(item.feature.id)}
                  onDragStart={() => drag.startDrag(item.feature.id, "feature")}
                  onDragOver={(e) => drag.onRowDragOver(e, `top-${i}`, `top-${i + 1}`)}
                  onDrop={(e) => drag.onRowDrop(e, `top-${i}`, `top-${i + 1}`)}
                  onDragEnd={drag.cleanup}
                />
              </div>
            );
          })}
          {drag.dragOverGap === `top-${items.length}` && <DropBar />}
          <div
            className="flex-1 min-h-8"
            onDragOver={drag.onTailDragOver}
            onDrop={drag.onTailDrop}
          />
        </div>
      )}
    </div>
  );
}

function DropBar({ indent }: { indent?: boolean }) {
  return <div className={`h-0.5 bg-primary ${indent ? "ml-6" : ""}`} />;
}

const GroupRow = React.memo(function GroupRow({
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
      className={`group/row flex items-center gap-1.5 px-3 py-1.5 cursor-grab text-sm border-b font-medium ${
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
          maxLength={100}
          showCounter={false}
        />
      ) : (
        <span className="flex-1 truncate" onDoubleClick={startRename}>
          {group.label || <span className="text-muted-foreground italic">Group</span>}
        </span>
      )}
      <span className="text-[10px] text-muted-foreground">{childCount}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        className="text-muted-foreground hover:text-foreground shrink-0 p-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity"
        title="Duplicate group"
      >
        <FaCopy className="w-3 h-3" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-muted-foreground hover:text-destructive shrink-0 p-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity"
        title="Delete group"
      >
        <FaTrash className="w-3 h-3" />
      </button>
    </div>
  );
});

const FeatureRow = React.memo(function FeatureRow({
  feature,
  isSelected,
  indent,
  legendEntries,
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
  legendEntries: LegendEntry[];
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const resolved = resolveFeatureStyle(feature, legendEntries);

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
      <FeatureSwatch feature={resolved} width={44} height={28} />
      <span className="flex-1 truncate">
        {feature.label || <span className="text-muted-foreground italic">Untitled</span>}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        className="text-muted-foreground hover:text-foreground shrink-0 p-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity"
        title="Duplicate feature"
      >
        <FaCopy className="w-3 h-3" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-muted-foreground hover:text-destructive shrink-0 p-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity"
        title="Delete feature"
      >
        <FaTrash className="w-3 h-3" />
      </button>
    </div>
  );
});
