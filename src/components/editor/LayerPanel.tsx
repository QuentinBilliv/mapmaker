"use client";

import { useState } from "react";
import { useEditorData, useEditorActions, useDrawingState } from "@/lib/editor-context";
import type { LayerData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function LayerPanel() {
  const { layers, features } = useEditorData();
  const { addLayer } = useEditorActions();
  const [newLayerName, setNewLayerName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

  const featureCounts = new Map<string, number>();
  for (const f of features) {
    featureCounts.set(f.layerId, (featureCounts.get(f.layerId) ?? 0) + 1);
  }

  const handleAdd = () => {
    if (!newLayerName.trim()) return;
    addLayer(newLayerName.trim());
    setNewLayerName("");
    setIsAdding(false);
  };

  return (
    <div className="shrink-0 border-b overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
        <h3 className="text-sm font-semibold text-foreground">Layers</h3>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setIsAdding(!isAdding)}
          title="Add layer"
        >
          +
        </Button>
      </div>
      {isAdding && (
        <AddLayerInput
          value={newLayerName}
          onChange={setNewLayerName}
          onSubmit={handleAdd}
        />
      )}
      <div className="max-h-80 overflow-y-auto">
        {sortedLayers.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            count={featureCounts.get(layer.id) ?? 0}
            canDelete={layers.length > 1}
          />
        ))}
      </div>
    </div>
  );
}

function AddLayerInput({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="p-2 border-b flex gap-1">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Layer name"
        autoFocus
      />
      <Button size="sm" onClick={onSubmit}>
        OK
      </Button>
    </div>
  );
}

function LayerRow({
  layer,
  count,
  canDelete,
}: {
  layer: LayerData;
  count: number;
  canDelete: boolean;
}) {
  const { activeLayerId } = useDrawingState();
  const { setActiveLayerId, toggleLayer, deleteLayer } = useEditorActions();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div
      onClick={() => setActiveLayerId(layer.id)}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm border-b last:border-b-0 ${
        activeLayerId === layer.id
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted text-foreground"
      }`}
    >
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={(e) => {
          e.stopPropagation();
          toggleLayer(layer.id);
        }}
        title={layer.visible ? "Hide" : "Show"}
        className="text-xs"
      >
        {layer.visible ? "👁" : "👁‍🗨"}
      </Button>
      <span className="flex-1 truncate">{layer.name}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
      {canDelete && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmOpen(true);
          }}
          title="Delete"
          className="text-destructive hover:text-destructive"
        >
          ✕
        </Button>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete layer "${layer.name}"?`}
        description="All features in this layer will be removed."
        onConfirm={() => deleteLayer(layer.id)}
      />
    </div>
  );
}
