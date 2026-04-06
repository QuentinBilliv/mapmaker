"use client";

import { useState, useCallback, useEffect, useMemo, useRef, forwardRef } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaXmark, FaPlus, FaFileImport, FaTrash, FaCheck, FaArrowUpFromBracket, FaMagnifyingGlass, FaRotateLeft, FaRotateRight } from "react-icons/fa6";
import { loadTileLayerGeoJSON, getRegionList, getTileLayerConfig, TILE_LAYERS, type RegionInfo } from "@/lib/choropleth";
import type { TileLayerId } from "@/lib/types";
import toast from "react-hot-toast";

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
          Add a category, then click countries on the map to assign them.
        </p>
      )}
      {choropleth.activeCategoryId && (
        <p className="text-xs text-muted-foreground italic text-center">
          Click countries on the map to assign them to the selected category. Click again to remove.
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

function GradientContent({
  choropleth,
  setChoropleth,
  onSetValue,
  onRemoveValue,
  onImport,
  onClearAll,
}: {
  choropleth: { tileLayer: TileLayerId; gradientColors?: [string, string]; gradientLabel?: string; values?: Record<string, number> };
  setChoropleth: (updates: Record<string, unknown>) => void;
  onSetValue: (iso: string, value: number) => void;
  onRemoveValue: (iso: string) => void;
  onImport: () => void;
  onClearAll: () => void;
}) {
  const safeValues = choropleth.values ?? {};
  const colors = choropleth.gradientColors ?? ["#22c55e", "#3b82f6"] as [string, string];
  const valueCount = Object.keys(safeValues).length;

  const [allCountries, setAllCountries] = useState<RegionInfo[]>([]);
  const [search, setSearch] = useState("");
  const [focusedIso, setFocusedIso] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const config = getTileLayerConfig(choropleth.tileLayer);
  useEffect(() => {
    loadTileLayerGeoJSON(choropleth.tileLayer).then((geojson) => {
      setAllCountries(getRegionList(geojson, config));
    });
  }, [choropleth.tileLayer, config]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { iso } = (e as CustomEvent).detail;
      setSearch("");
      setFocusedIso(iso);
      setTimeout(() => {
        const row = rowRefs.current[iso];
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          const input = row.querySelector<HTMLInputElement>("input[type='text']");
          if (input) input.focus();
        }
      }, 50);
    };
    window.addEventListener("mapmaker:country-clicked", handler);
    return () => window.removeEventListener("mapmaker:country-clicked", handler);
  }, []);

  const countryMap = useMemo(() => {
    const map = new Map<string, RegionInfo>();
    allCountries.forEach((c) => map.set(c.id, c));
    return map;
  }, [allCountries]);

  const countriesWithValues = useMemo(() => {
    return Object.keys(safeValues)
      .map((iso) => countryMap.get(iso))
      .filter((c): c is RegionInfo => !!c)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [safeValues, countryMap]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allCountries
      .filter((c) =>
        (c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
        && !(c.id in safeValues)
      )
      .slice(0, 5);
  }, [allCountries, search, safeValues]);

  const focusedCountry = useMemo(() => {
    if (!focusedIso || focusedIso in safeValues) return null;
    if (searchResults.some((c) => c.id === focusedIso)) return null;
    return countryMap.get(focusedIso) ?? null;
  }, [focusedIso, safeValues, searchResults, countryMap]);

  const handleSetValue = useCallback((iso: string, v: number) => {
    onSetValue(iso, v);
    setFocusedIso(null);
  }, [onSetValue]);

  return (
    <>
      <Input
        value={choropleth.gradientLabel ?? ""}
        onChange={(e) => setChoropleth({ gradientLabel: e.target.value })}
        placeholder="Gradient label (shown in legend)"
        className="h-7 text-xs"
        maxLength={100}
      />
      <div
        className="h-6 rounded-md border border-input"
        style={{
          background: `linear-gradient(to right, ${colors[0]}, ${colors[1]})`,
        }}
      />
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex items-center gap-1.5">
          <input
            type="color"
            value={colors[0]}
            onChange={(e) => setChoropleth({ gradientColors: [e.target.value, colors[1]] })}
            className="w-6 h-6 rounded cursor-pointer border border-input shrink-0"
          />
          <span className="text-xs text-muted-foreground">Start</span>
        </div>
        <div className="flex-1 flex items-center gap-1.5 justify-end">
          <span className="text-xs text-muted-foreground">End</span>
          <input
            type="color"
            value={colors[1]}
            onChange={(e) => setChoropleth({ gradientColors: [colors[0], e.target.value] })}
            className="w-6 h-6 rounded cursor-pointer border border-input shrink-0"
          />
        </div>
      </div>
      <Button size="sm" variant="outline" className="w-full text-xs" onClick={onImport}>
        <FaFileImport className="w-3 h-3 mr-1" />
        Import
      </Button>
      {valueCount > 0 && (
        <Button variant="ghost" size="sm" className="w-full text-xs text-destructive" onClick={onClearAll}>
          Clear all
        </Button>
      )}
      <div className="border-t pt-2 -mx-4 px-4">
        <div className="relative mb-2">
          <FaMagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a country..."
            className="w-full h-7 rounded-md border border-input bg-transparent pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        {focusedCountry && (
          <CountryValueRow
            ref={(el) => { rowRefs.current[focusedCountry.id] = el; }}
            country={focusedCountry}
            value={undefined}
            autoFocus
            onSetValue={(v) => handleSetValue(focusedCountry.id, v)}
            onRemoveValue={() => { onRemoveValue(focusedCountry.id); setFocusedIso(null); }}
          />
        )}
        {searchResults.map((c) => (
          <CountryValueRow
            key={c.id}
            ref={(el) => { rowRefs.current[c.id] = el; }}
            country={c}
            value={undefined}
            onSetValue={(v) => handleSetValue(c.id, v)}
            onRemoveValue={() => onRemoveValue(c.id)}
          />
        ))}
        {countriesWithValues.length > 0 && searchResults.length > 0 && (
          <div className="py-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned</span>
          </div>
        )}
        {countriesWithValues.map((c) => (
          <CountryValueRow
            key={c.id}
            ref={(el) => { rowRefs.current[c.id] = el; }}
            country={c}
            value={safeValues[c.id]}
            onSetValue={(v) => handleSetValue(c.id, v)}
            onRemoveValue={() => onRemoveValue(c.id)}
          />
        ))}
        {countriesWithValues.length === 0 && searchResults.length === 0 && !focusedCountry && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Click a country on the map or search above to add values.
          </p>
        )}
      </div>
    </>
  );
}

const CountryValueRow = forwardRef<
  HTMLDivElement,
  {
    country: RegionInfo;
    value: number | undefined;
    autoFocus?: boolean;
    onSetValue: (v: number) => void;
    onRemoveValue: () => void;
  }
>(function CountryValueRow({ country, value, autoFocus, onSetValue, onRemoveValue }, ref) {
  const [editing, setEditing] = useState(autoFocus ?? false);
  const [text, setText] = useState(value?.toString() ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(value?.toString() ?? "");
  }, [value]);

  useEffect(() => {
    if (autoFocus) {
      setEditing(true);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [autoFocus]);

  const handleSubmit = useCallback(() => {
    setEditing(false);
    const trimmed = text.trim();
    if (!trimmed) {
      if (value !== undefined) onRemoveValue();
      return;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      setText(value?.toString() ?? "");
      return;
    }
    onSetValue(num);
  }, [text, value, onSetValue, onRemoveValue]);

  const handleStartEdit = useCallback(() => {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, []);

  return (
    <div ref={ref} className="flex items-center gap-2 px-3 py-1.5">
      <span className="flex-1 text-xs truncate">{country.name}</span>
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") { setText(value?.toString() ?? ""); setEditing(false); }
          }}
          className="w-20 h-6 rounded border border-input bg-transparent px-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <button
          onClick={handleStartEdit}
          className={`w-20 h-6 rounded border border-input px-1.5 text-xs text-right transition-colors hover:bg-accent ${
            value !== undefined ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {value !== undefined ? value : "Set a value"}
        </button>
      )}
      {value !== undefined && (
        <button
          onClick={onRemoveValue}
          className="text-muted-foreground hover:text-destructive shrink-0"
          title="Remove value"
        >
          <FaXmark className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});

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
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
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

function parseImportData(
  raw: string,
  validIsos: Set<string>,
): { ok: true; data: { label: string; color: string; countries: string[] }[]; message: string } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  if (Array.isArray(parsed)) {
    const result: { label: string; color: string; countries: string[] }[] = [];
    for (const item of parsed) {
      if (!item.label || !item.color || !Array.isArray(item.countries)) {
        return { ok: false, error: "Each item needs label, color, and countries array" };
      }
      const valid = item.countries.filter((iso: string) => validIsos.has(iso.toUpperCase())).map((iso: string) => iso.toUpperCase());
      if (valid.length > 0) result.push({ label: item.label, color: item.color, countries: valid });
    }
    if (result.length === 0) return { ok: false, error: "No valid categories found" };
    return { ok: true, data: result, message: `Imported ${result.length} ${result.length === 1 ? "category" : "categories"}` };
  }
  if (typeof parsed === "object" && parsed !== null) {
    const byColor = new Map<string, string[]>();
    let count = 0;
    for (const [iso, color] of Object.entries(parsed)) {
      if (typeof color !== "string") continue;
      const upper = iso.toUpperCase();
      if (!validIsos.has(upper)) continue;
      if (!byColor.has(color)) byColor.set(color, []);
      byColor.get(color)!.push(upper);
      count++;
    }
    if (count === 0) return { ok: false, error: "No valid country codes found" };
    const result: { label: string; color: string; countries: string[] }[] = [];
    let idx = 1;
    byColor.forEach((isos, color) => {
      result.push({ label: `Category ${idx++}`, color, countries: isos });
    });
    return { ok: true, data: result, message: `Imported ${count} ${count === 1 ? "country" : "countries"} in ${result.length} ${result.length === 1 ? "category" : "categories"}` };
  }
  return { ok: false, error: "Expected a JSON array or object" };
}

function parseGradientImportData(
  raw: string,
  validIsos: Set<string>,
): { ok: true; data: Record<string, number>; message: string } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Expected a JSON object mapping ISO codes to numbers" };
  }
  const result: Record<string, number> = {};
  let count = 0;
  for (const [iso, value] of Object.entries(parsed)) {
    if (typeof value !== "number" || isNaN(value)) continue;
    const upper = iso.toUpperCase();
    if (!validIsos.has(upper)) continue;
    result[upper] = value;
    count++;
  }
  if (count === 0) return { ok: false, error: "No valid country codes with numeric values found" };
  return { ok: true, data: result, message: `Imported ${count} ${count === 1 ? "country" : "countries"}` };
}

function ImportDialog({
  tileLayer,
  onClose,
  onImport,
}: {
  tileLayer: TileLayerId;
  onClose: () => void;
  onImport: (data: { label: string; color: string; countries: string[] }[]) => void;
}) {
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [countries, setCountries] = useState<RegionInfo[]>([]);
  const config = getTileLayerConfig(tileLayer);

  useEffect(() => {
    loadTileLayerGeoJSON(tileLayer).then((geojson) => {
      setCountries(getRegionList(geojson, config));
    });
  }, [tileLayer, config]);

  const validIsos = useMemo(() => new Set(countries.map((c) => c.id)), [countries]);

  const processText = useCallback((raw: string) => {
    const result = parseImportData(raw, validIsos);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onImport(result.data);
    toast.success(result.message);
    onClose();
  }, [validIsos, onImport, onClose]);

  const handleImport = useCallback(() => {
    processText(text);
  }, [text, processText]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith(".json") && file.type !== "application/json" && !file.name.endsWith(".txt") && file.type !== "text/plain") {
      toast.error("Drop a .json or .txt file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setText(content);
      processText(content);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  }, [processText]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setText(content);
      processText(content);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  }, [processText]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-popover rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Import Choropleth</h3>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <FaXmark className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p>Grouped format:</p>
          <pre className="bg-muted p-2 rounded text-[10px] overflow-x-auto">
{`[
  { "label": "Group A", "color": "#3b82f6",
    "countries": ["FRA", "DEU"] },
  { "label": "Group B", "color": "#ef4444",
    "countries": ["USA", "CAN"] }
]`}
          </pre>
          <p>Or flat format (auto-groups by color):</p>
          <pre className="bg-muted p-2 rounded text-[10px]">
{`{ "FRA": "#3b82f6", "DEU": "#3b82f6" }`}
          </pre>
        </div>
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 transition-colors cursor-pointer ${
            dragging ? "border-primary bg-primary/5" : "border-input hover:border-muted-foreground"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <FaArrowUpFromBracket className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Drop a .json file or click to browse</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,application/json,text/plain"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-input" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="flex-1 border-t border-input" />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Paste JSON..."
        />
        <Button size="sm" className="w-full text-xs" onClick={handleImport} disabled={!text.trim()}>
          Import
        </Button>
      </div>
    </div>
  );
}

function GradientImportDialog({
  tileLayer,
  onClose,
  onImport,
}: {
  tileLayer: TileLayerId;
  onClose: () => void;
  onImport: (data: Record<string, number>) => void;
}) {
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [countries, setCountries] = useState<RegionInfo[]>([]);
  const config = getTileLayerConfig(tileLayer);

  useEffect(() => {
    loadTileLayerGeoJSON(tileLayer).then((geojson) => {
      setCountries(getRegionList(geojson, config));
    });
  }, [tileLayer, config]);

  const validIsos = useMemo(() => new Set(countries.map((c) => c.id)), [countries]);

  const processText = useCallback((raw: string) => {
    const result = parseGradientImportData(raw, validIsos);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onImport(result.data);
    toast.success(result.message);
    onClose();
  }, [validIsos, onImport, onClose]);

  const handleImport = useCallback(() => {
    processText(text);
  }, [text, processText]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith(".json") && file.type !== "application/json" && !file.name.endsWith(".txt") && file.type !== "text/plain") {
      toast.error("Drop a .json or .txt file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setText(content);
      processText(content);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  }, [processText]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setText(content);
      processText(content);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  }, [processText]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-popover rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Import Gradient Values</h3>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <FaXmark className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p>Map ISO-3 country codes to numeric values:</p>
          <pre className="bg-muted p-2 rounded text-[10px] overflow-x-auto">
{`{
  "FRA": 0.9764,
  "USA": 0.2264,
  "GBR": 0.14,
  "ESP": 0.94,
  "JPN": 0.333
}`}
          </pre>
        </div>
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 transition-colors cursor-pointer ${
            dragging ? "border-primary bg-primary/5" : "border-input hover:border-muted-foreground"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <FaArrowUpFromBracket className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Drop a .json file or click to browse</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,application/json,text/plain"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-input" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="flex-1 border-t border-input" />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Paste JSON..."
        />
        <Button size="sm" className="w-full text-xs" onClick={handleImport} disabled={!text.trim()}>
          Import
        </Button>
      </div>
    </div>
  );
}
