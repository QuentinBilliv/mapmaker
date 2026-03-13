"use client";

import { useMemo, useRef, useState } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import type { FeatureData } from "@/lib/types";
import { ShapePreview } from "@/components/ui/marker-icons";

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

export default function FeaturePanel() {
  const { features, layers, selectedFeature } = useEditorData();
  const { selectFeature, reorderFeatures } = useEditorActions();
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  const layerMap = new Map(layers.map((l) => [l.id, l]));
  const sorted = useMemo(
    () => [...features].sort((a, b) => a.order - b.order),
    [features]
  );

  function handleDragStart(id: string) {
    draggedIdRef.current = id;
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (draggedIdRef.current && draggedIdRef.current !== id) {
      setDragOverId(id);
    }
  }

  function handleDrop(targetId: string) {
    const draggedId = draggedIdRef.current;
    if (!draggedId || draggedId === targetId) {
      cleanup();
      return;
    }
    const ids = sorted.map((f) => f.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) {
      cleanup();
      return;
    }
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggedId);
    reorderFeatures(ids);
    cleanup();
  }

  function cleanup() {
    draggedIdRef.current = null;
    setDragOverId(null);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Features</h3>
        <span className="text-xs text-muted-foreground">{features.length}</span>
      </div>
      {features.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground text-center">
          No features yet. Draw something on the map.
        </p>
      ) : (
        <div className="overflow-y-auto">
          {sorted.map((feature) => (
            <FeatureRow
              key={feature.id}
              feature={feature}
              layerName={layerMap.get(feature.layerId)?.name}
              isSelected={selectedFeature?.id === feature.id}
              isDragOver={dragOverId === feature.id}
              onSelect={() => selectFeature(feature.id)}
              onDragStart={() => handleDragStart(feature.id)}
              onDragOver={(e) => handleDragOver(e, feature.id)}
              onDrop={() => handleDrop(feature.id)}
              onDragEnd={cleanup}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureRow({
  feature,
  layerName,
  isSelected,
  isDragOver,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  feature: FeatureData;
  layerName?: string;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: () => void;
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
      className={`flex items-center gap-2 px-3 py-1.5 cursor-grab text-sm border-b last:border-b-0 ${
        isDragOver
          ? "border-t-2 border-t-primary"
          : ""
      } ${
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted text-foreground"
      }`}
    >
      <FeatureIcon feature={feature} />
      <span className="flex-1 truncate">
        {feature.label || <span className="text-muted-foreground italic">Untitled</span>}
      </span>
      {layerName && (
        <span className="text-[10px] text-muted-foreground truncate max-w-16">
          {layerName}
        </span>
      )}
    </div>
  );
}
