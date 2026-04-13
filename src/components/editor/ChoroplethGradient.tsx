"use client";

import { useState, useCallback, useEffect, useMemo, useRef, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaXmark, FaFileImport, FaMagnifyingGlass } from "react-icons/fa6";
import { loadTileLayerGeoJSON, getRegionList, getTileLayerConfig, type RegionInfo } from "@/lib/choropleth";
import type { TileLayerId } from "@/lib/types";
import toast from "react-hot-toast";

export function GradientContent({
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

  useEffect(() => {
    const config = getTileLayerConfig(choropleth.tileLayer);
    loadTileLayerGeoJSON(choropleth.tileLayer).then((geojson) => {
      setAllCountries(getRegionList(geojson, config));
    }).catch(() => {
      toast.error("Failed to load regions");
    });
  }, [choropleth.tileLayer]);

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
    window.addEventListener("idomap:country-clicked", handler);
    return () => window.removeEventListener("idomap:country-clicked", handler);
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
            placeholder="Search a region..."
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
            Click a region on the map or search above to add values.
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
