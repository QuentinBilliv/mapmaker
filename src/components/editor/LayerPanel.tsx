"use client";

import { useState } from "react";
import { useEditor } from "@/lib/editor-context";
import type { LayerData } from "@/lib/types";

export default function LayerPanel() {
  const { layers, features, addLayer } = useEditor();
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
    <div className="absolute right-3 top-3 z-10 w-64 bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <h3 className="text-sm font-semibold text-gray-700">Layers</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-blue-600 hover:text-blue-700 text-lg leading-none"
          title="Add layer"
        >
          +
        </button>
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
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Layer name"
        className="flex-1 px-2 py-1 border rounded text-sm"
        autoFocus
      />
      <button
        onClick={onSubmit}
        className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
      >
        OK
      </button>
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
  const { activeLayerId, setActiveLayerId, toggleLayer, deleteLayer } = useEditor();

  return (
    <div
      onClick={() => setActiveLayerId(layer.id)}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm border-b last:border-b-0 ${
        activeLayerId === layer.id
          ? "bg-blue-50 text-blue-700"
          : "hover:bg-gray-50 text-gray-700"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleLayer(layer.id);
        }}
        className="text-xs"
        title={layer.visible ? "Hide" : "Show"}
      >
        {layer.visible ? "👁" : "👁‍🗨"}
      </button>

      <span className="flex-1 truncate">{layer.name}</span>
      <span className="text-xs text-gray-400">{count}</span>
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete layer "${layer.name}"?`)) deleteLayer(layer.id);
          }}
          className="text-red-400 hover:text-red-600 text-xs"
          title="Delete"
        >
          ✕
        </button>
      )}
    </div>
  );
}
