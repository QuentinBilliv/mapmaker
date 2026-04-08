"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { Button } from "@/components/ui/button";
import { FaXmark, FaPlus, FaFileImport, FaTrash, FaCheck, FaRotateLeft, FaRotateRight } from "react-icons/fa6";
import { TILE_LAYERS } from "@/lib/choropleth";
import type { TileLayerId } from "@/lib/types";
import { GradientContent } from "@/components/editor/ChoroplethGradient";
import { ImportDialog, GradientImportDialog } from "@/components/editor/ChoroplethImport";

const CATEGORY_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#06b6d4",
];

interface ChoroplethDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ChoroplethDialog({ open, onClose }: ChoroplethDialogProps) {
  const { choropleth, canUndo, canRedo } = useEditorData();
  const {
    setChoropleth, addChoroplethCategory, updateChoroplethCategory,
    deleteChoroplethCategory, importChoroplethData,
    setGradientValue, removeGradientValue, importGradientData,
    undo, redo,
  } = useEditorActions();
  const [showImport, setShowImport] = useState(false);

  const sortedCategories = useMemo(
    () => [...choropleth.categories].sort((a, b) => a.order - b.order),
    [choropleth.categories],
  );

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const catId of Object.values(choropleth.assignments)) {
      counts[catId] = (counts[catId] ?? 0) + 1;
    }
    return counts;
  }, [choropleth.assignments]);

  const handleAddCategory = useCallback(() => {
    const nextColor = CATEGORY_COLORS[choropleth.categories.length % CATEGORY_COLORS.length];
    addChoroplethCategory(nextColor, `Category ${choropleth.categories.length + 1}`);
  }, [addChoroplethCategory, choropleth.categories.length]);

  const handleClearAll = useCallback(() => {
    if (choropleth.mode === "gradient") {
      setChoropleth({ values: {}, gradientColors: ["#22c55e", "#3b82f6"] });
    } else {
      setChoropleth({ categories: [], assignments: {}, activeCategoryId: null });
    }
  }, [setChoropleth, choropleth.mode]);

  const handleModeSwitch = useCallback((mode: "discrete" | "gradient") => {
    setChoropleth({ mode });
  }, [setChoropleth]);

  const handleTileLayerChange = useCallback((layerId: TileLayerId) => {
    setChoropleth({ tileLayer: layerId, categories: [], assignments: {}, values: {}, activeCategoryId: null });
  }, [setChoropleth]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/40 md:hidden"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 bottom-0 z-40 w-80 max-w-[calc(100vw-3rem)] bg-popover flex flex-col border-l shadow-xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 className="text-sm font-semibold">Choropleth</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-xs" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">
              <FaRotateLeft />
            </Button>
            <Button variant="ghost" size="icon-xs" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Shift+Z)">
              <FaRotateRight />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <FaXmark className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 space-y-3">
            <select
              value={choropleth.tileLayer}
              onChange={(e) => handleTileLayerChange(e.target.value as TileLayerId)}
              className="w-full rounded-md border bg-transparent px-2 py-1.5 text-xs"
            >
              {TILE_LAYERS.map((layer) => (
                <option key={layer.id} value={layer.id}>{layer.label}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={choropleth.mode === "discrete" ? "default" : "outline"}
                className="flex-1 text-xs"
                onClick={() => handleModeSwitch("discrete")}
              >
                Discrete
              </Button>
              <Button
                size="sm"
                variant={choropleth.mode === "gradient" ? "default" : "outline"}
                className="flex-1 text-xs"
                onClick={() => handleModeSwitch("gradient")}
              >
                Gradient
              </Button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Opacity</span>
                <span className="text-xs text-muted-foreground">{Math.round(choropleth.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={choropleth.opacity}
                onChange={(e) => setChoropleth({ opacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 accent-primary"
              />
            </div>
            {choropleth.mode === "discrete" ? (
              <DiscreteContent
                sortedCategories={sortedCategories}
                countByCategory={countByCategory}
                choropleth={choropleth}
                setChoropleth={setChoropleth}
                updateChoroplethCategory={updateChoroplethCategory}
                deleteChoroplethCategory={deleteChoroplethCategory}
                onAddCategory={handleAddCategory}
                onImport={() => setShowImport(true)}
                onClearAll={handleClearAll}
              />
            ) : (
              <GradientContent
                choropleth={choropleth}
                setChoropleth={setChoropleth}
                onSetValue={setGradientValue}
                onRemoveValue={removeGradientValue}
                onImport={() => setShowImport(true)}
                onClearAll={handleClearAll}
              />
            )}
          </div>
        </div>
      </aside>
      {showImport && (
        choropleth.mode === "discrete" ? (
          <ImportDialog
            tileLayer={choropleth.tileLayer}
            onClose={() => setShowImport(false)}
            onImport={importChoroplethData}
          />
        ) : (
          <GradientImportDialog
            tileLayer={choropleth.tileLayer}
            onClose={() => setShowImport(false)}
            onImport={importGradientData}
          />
        )
      )}
    </>
  );
}

function DiscreteContent({
  sortedCategories,
  countByCategory,
  choropleth,
  setChoropleth,
  updateChoroplethCategory,
  deleteChoroplethCategory,
  onAddCategory,
  onImport,
  onClearAll,
}: {
  sortedCategories: { id: string; color: string; label: string; order: number }[];
  countByCategory: Record<string, number>;
  choropleth: { activeCategoryId: string | null };
  setChoropleth: (updates: Record<string, unknown>) => void;
  updateChoroplethCategory: (id: string, updates: Partial<{ color: string; label: string }>) => void;
  deleteChoroplethCategory: (id: string) => void;
  onAddCategory: () => void;
  onImport: () => void;
  onClearAll: () => void;
}) {
  return (
    <>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={onAddCategory}>
          <FaPlus className="w-3 h-3 mr-1" />
          Add category
        </Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={onImport}>
          <FaFileImport className="w-3 h-3" />
        </Button>
      </div>
      {sortedCategories.length > 0 && (
        <div className="space-y-1">
          {sortedCategories.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              count={countByCategory[cat.id] ?? 0}
              isActive={choropleth.activeCategoryId === cat.id}
              onSelect={() => setChoropleth({ activeCategoryId: choropleth.activeCategoryId === cat.id ? null : cat.id })}
              onColorChange={(color) => updateChoroplethCategory(cat.id, { color })}
              onLabelChange={(label) => updateChoroplethCategory(cat.id, { label })}
              onDelete={() => deleteChoroplethCategory(cat.id)}
            />
          ))}
        </div>
      )}
      {sortedCategories.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Add a category, then click regions on the map to assign them.
        </p>
      )}
      {choropleth.activeCategoryId && (
        <p className="text-xs text-muted-foreground italic text-center">
          Click regions on the map to assign them to the selected category. Click again to remove.
        </p>
      )}
      {sortedCategories.length > 0 && (
        <Button variant="ghost" size="sm" className="w-full text-xs text-destructive" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </>
  );
}

function CategoryRow({
  category,
  count,
  isActive,
  onSelect,
  onColorChange,
  onLabelChange,
  onDelete,
}: {
  category: { id: string; color: string; label: string };
  count: number;
  isActive: boolean;
  onSelect: () => void;
  onColorChange: (color: string) => void;
  onLabelChange: (label: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(category.label);

  useEffect(() => { setLabel(category.label); }, [category.label]);

  const handleSubmit = () => {
    const trimmed = label.trim();
    if (trimmed && trimmed !== category.label) onLabelChange(trimmed);
    setEditing(false);
  };

  return (
    <div
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
        isActive ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent"
      }`}
      onClick={onSelect}
    >
      <input
        type="color"
        value={category.color}
        onChange={(e) => onColorChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="w-5 h-5 rounded cursor-pointer border border-input shrink-0"
      />
      {editing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") { setLabel(category.label); setEditing(false); } }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 h-6 bg-transparent border-b border-input text-xs focus:outline-none"
          maxLength={50}
        />
      ) : (
        <span
          className="flex-1 text-xs truncate"
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
          {category.label}
        </span>
      )}
      {count > 0 && (
        <span className="text-[10px] text-muted-foreground shrink-0">{count}</span>
      )}
      {isActive && <FaCheck className="w-3 h-3 text-primary shrink-0" />}
      <Button
        variant="ghost"
        size="icon-xs"
        className="opacity-0 group-hover:opacity-100 shrink-0"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <FaTrash className="w-3 h-3 text-destructive" />
      </Button>
    </div>
  );
}
