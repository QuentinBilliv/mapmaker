"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { Button } from "@/components/ui/button";
import { FaXmark, FaChevronDown, FaChevronRight, FaEarthAmericas, FaFileImport } from "react-icons/fa6";
import { loadCountriesGeoJSON, getCountryList, type CountryInfo } from "@/lib/choropleth";
import toast from "react-hot-toast";

export default function ChoroplethPanel() {
  const { choropleth } = useEditorData();
  const { setChoropleth, setChoroplethColor, removeChoroplethEntry } = useEditorActions();
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState("");
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");

  useEffect(() => {
    if (!choropleth.enabled) return;
    let dead = false;
    loadCountriesGeoJSON().then((geojson) => {
      if (dead) return;
      setCountries(getCountryList(geojson));
    });
    return () => { dead = true; };
  }, [choropleth.enabled]);

  const paintedEntries = useMemo(
    () => Object.entries(choropleth.entries).sort(([, a], [, b]) => a.name.localeCompare(b.name)),
    [choropleth.entries],
  );

  const countriesByIso = useMemo(
    () => new Map(countries.map((c) => [c.iso, c])),
    [countries],
  );

  const filtered = useMemo(
    () =>
      search.trim()
        ? countries.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.iso.toLowerCase().includes(search.toLowerCase()))
        : [],
    [countries, search],
  );

  const handleToggle = useCallback(() => {
    setChoropleth({ enabled: !choropleth.enabled });
  }, [setChoropleth, choropleth.enabled]);

  const handleCountrySelect = useCallback(
    (country: CountryInfo) => {
      setChoroplethColor(country.iso, choropleth.activeColor, country.name);
      setSearch("");
    },
    [setChoroplethColor, choropleth.activeColor],
  );

  const handleImport = useCallback(() => {
    try {
      const parsed = JSON.parse(importJson);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        toast.error("Expected a JSON object like { \"FRA\": \"#3b82f6\" }");
        return;
      }
      let count = 0;
      for (const [iso, color] of Object.entries(parsed)) {
        if (typeof color !== "string") continue;
        const country = countriesByIso.get(iso.toUpperCase());
        if (country) {
          setChoroplethColor(country.iso, color, country.name);
          count++;
        }
      }
      if (count === 0) {
        toast.error("No valid country codes found");
      } else {
        toast.success(`Imported ${count} ${count === 1 ? "country" : "countries"}`);
        setImportJson("");
        setShowImport(false);
      }
    } catch {
      toast.error("Invalid JSON");
    }
  }, [importJson, countriesByIso, setChoroplethColor]);

  return (
    <div className="border-t flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b shrink-0">
        <button
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <FaChevronDown className="w-2.5 h-2.5" /> : <FaChevronRight className="w-2.5 h-2.5" />}
          <FaEarthAmericas className="w-3.5 h-3.5" />
          Choropleth
        </button>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="text-xs text-muted-foreground">{choropleth.enabled ? "On" : "Off"}</span>
          <input
            type="checkbox"
            checked={choropleth.enabled}
            onChange={handleToggle}
            className="w-4 h-4 accent-primary"
          />
        </label>
      </div>
      {expanded && choropleth.enabled && (
        <div className="px-3 py-2 space-y-3 max-h-64 overflow-y-auto">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={choropleth.activeColor}
              onChange={(e) => setChoropleth({ activeColor: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border border-input"
              title="Paint color"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className="flex-1 h-7 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              title="Import JSON"
              onClick={() => setShowImport((v) => !v)}
            >
              <FaFileImport className="w-3.5 h-3.5" />
            </Button>
          </div>
          {filtered.length > 0 && (
            <div className="border rounded-md max-h-32 overflow-y-auto">
              {filtered.slice(0, 20).map((c) => (
                <button
                  key={c.iso}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-accent flex items-center gap-2"
                  onClick={() => handleCountrySelect(c)}
                >
                  <span
                    className="w-3 h-3 rounded-sm shrink-0 border border-input"
                    style={{ backgroundColor: choropleth.entries[c.iso]?.color ?? choropleth.activeColor }}
                  />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-muted-foreground">{c.iso}</span>
                </button>
              ))}
            </div>
          )}
          {showImport && (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Paste JSON: {"{ \"FRA\": \"#3b82f6\", \"DEU\": \"#ef4444\" }"}</span>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder='{ "FRA": "#3b82f6", "DEU": "#ef4444" }'
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="flex-1 text-xs" onClick={handleImport}>
                  Import
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setShowImport(false); setImportJson(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
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
          <p className="text-xs text-muted-foreground italic">Click a country on the map to paint it with the active color. Click again to remove.</p>
          {paintedEntries.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">{paintedEntries.length} countries</span>
              {paintedEntries.map(([iso, entry]) => (
                <div key={iso} className="flex items-center gap-2 group">
                  <input
                    type="color"
                    value={entry.color}
                    onChange={(e) => setChoroplethColor(iso, e.target.value, entry.name)}
                    className="w-4 h-4 rounded cursor-pointer border border-input shrink-0"
                  />
                  <span className="text-xs flex-1 truncate">{entry.name}</span>
                  <span className="text-xs text-muted-foreground">{iso}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => removeChoroplethEntry(iso)}
                  >
                    <FaXmark className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {paintedEntries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-destructive"
              onClick={() => setChoropleth({ entries: {} })}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
