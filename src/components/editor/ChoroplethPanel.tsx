"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { Button } from "@/components/ui/button";
import { FaXmark, FaChevronDown, FaChevronRight, FaEarthAmericas } from "react-icons/fa6";
import { loadCountriesGeoJSON, getCountryNames } from "@/lib/choropleth";

export default function ChoroplethPanel() {
  const { choropleth } = useEditorData();
  const { setChoropleth, setChoroplethColor, removeChoroplethEntry } = useEditorActions();
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState("");
  const [activeColor, setActiveColor] = useState("#3b82f6");
  const [countryNames, setCountryNames] = useState<string[]>([]);

  useEffect(() => {
    if (!choropleth.enabled) return;
    let dead = false;
    loadCountriesGeoJSON().then((geojson) => {
      if (dead) return;
      setCountryNames(getCountryNames(geojson));
    });
    return () => { dead = true; };
  }, [choropleth.enabled]);

  const paintedCountries = useMemo(
    () => Object.entries(choropleth.entries).sort(([a], [b]) => a.localeCompare(b)),
    [choropleth.entries],
  );

  const filteredNames = useMemo(
    () =>
      search.trim()
        ? countryNames.filter((n) => n.toLowerCase().includes(search.toLowerCase()))
        : [],
    [countryNames, search],
  );

  const handleToggle = useCallback(() => {
    setChoropleth({ enabled: !choropleth.enabled });
  }, [setChoropleth, choropleth.enabled]);

  const handleCountrySelect = useCallback(
    (name: string) => {
      setChoroplethColor(name, activeColor);
      setSearch("");
    },
    [setChoroplethColor, activeColor],
  );

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
              value={activeColor}
              onChange={(e) => setActiveColor(e.target.value)}
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
          </div>
          {filteredNames.length > 0 && (
            <div className="border rounded-md max-h-32 overflow-y-auto">
              {filteredNames.slice(0, 20).map((name) => (
                <button
                  key={name}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-accent flex items-center gap-2"
                  onClick={() => handleCountrySelect(name)}
                >
                  <span
                    className="w-3 h-3 rounded-sm shrink-0 border border-input"
                    style={{ backgroundColor: choropleth.entries[name] ?? activeColor }}
                  />
                  {name}
                </button>
              ))}
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
          {paintedCountries.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">{paintedCountries.length} countries</span>
              {paintedCountries.map(([name, color]) => (
                <div key={name} className="flex items-center gap-2 group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setChoroplethColor(name, e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border border-input shrink-0"
                  />
                  <span className="text-xs flex-1 truncate">{name}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => removeChoroplethEntry(name)}
                  >
                    <FaXmark className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {paintedCountries.length > 0 && (
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
