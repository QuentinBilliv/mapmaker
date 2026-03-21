"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { FaCheck, FaXmark } from "react-icons/fa6";
import { useEditorActions, useEditorData } from "@/lib/editor-context";
import {
  fetchCountries,
  fetchBoundary,
  type GeoBankCountry,
  type GeoBankSubdivision,
} from "@/lib/geobank";

const CONTINENTS = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"] as const;

export default function GeoBankDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [continent, setContinent] = useState<string>("All");
  const [countries, setCountries] = useState<GeoBankCountry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<GeoBankCountry | null>(null);
  const [admLevel, setAdmLevel] = useState(0);
  const [subdivisions, setSubdivisions] = useState<GeoBankSubdivision[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [subQuery, setSubQuery] = useState("");
  const { addBankFeature } = useEditorActions();
  const { features, featureLimit } = useEditorData();
  const remaining = featureLimit === Infinity ? Infinity : featureLimit - features.length;
  const addedLabels = useMemo(() => new Set(features.map((f) => f.label)), [features]);

  useEffect(() => {
    if (!open || countries.length > 0) return;
    setLoading(true);
    fetchCountries()
      .then(setCountries)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, countries.length]);

  const filtered = useMemo(() => {
    let list = countries;
    if (continent !== "All") list = list.filter((c) => c.continent === continent);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.iso.toLowerCase().includes(q) ||
          c.subregion.toLowerCase().includes(q)
      );
    }
    return list;
  }, [countries, continent, query]);

  const loadSubdivisions = useCallback(
    async (country: GeoBankCountry, level: number) => {
      setSelectedCountry(country);
      setAdmLevel(level);
      setSubdivisions([]);
      setSubQuery("");
      if (level === 0) return;
      setLoadingSub(true);
      try {
        const { geojson } = await fetchBoundary(country.iso, level);
        setSubdivisions(
          geojson.features.map((f) => ({
            name: (f.properties?.shapeName as string) || "Unknown",
            iso: (f.properties?.shapeISO as string) || "",
            id: (f.properties?.shapeID as string) || "",
            geometry: f.geometry,
          }))
        );
      } catch {
        setSubdivisions([]);
      } finally {
        setLoadingSub(false);
      }
    },
    []
  );

  const handleAddCountry = useCallback(
    async (country: GeoBankCountry) => {
      if (remaining <= 0) return;
      setAdding(country.iso);
      try {
        const { geojson } = await fetchBoundary(country.iso, 0);
        const geometry = geojson.features[0]?.geometry;
        if (geometry) addBankFeature(geometry, country.name);
      } catch { /* silently fail */ }
      setAdding(null);
    },
    [addBankFeature, remaining]
  );

  const handleAddSubdivision = useCallback(
    (sub: GeoBankSubdivision) => {
      if (remaining <= 0) return;
      addBankFeature(sub.geometry, sub.name);
    },
    [addBankFeature, remaining]
  );

  const handleAddAllSubdivisions = useCallback(
    () => {
      if (subdivisions.length === 0 || !selectedCountry) return;
      const toAdd = remaining === Infinity ? subdivisions : subdivisions.slice(0, remaining);
      for (const sub of toAdd) {
        addBankFeature(sub.geometry, sub.name);
      }
    },
    [subdivisions, selectedCountry, addBankFeature, remaining]
  );

  const back = useCallback(() => {
    setSelectedCountry(null);
    setSubdivisions([]);
    setSubQuery("");
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col gap-3">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>
            {selectedCountry ? (
              <button onClick={back} className="hover:underline">
                ← {selectedCountry.name}
              </button>
            ) : (
              "GeoJSON Bank"
            )}
          </DialogTitle>
          <DialogClose className="text-muted-foreground hover:text-foreground">
            <FaXmark size={16} />
          </DialogClose>
        </DialogHeader>
        {remaining <= 0 && (
          <p className="text-sm text-destructive">Feature limit reached ({featureLimit})</p>
        )}
        {selectedCountry ? (
          <SubdivisionView
            country={selectedCountry}
            admLevel={admLevel}
            subdivisions={subdivisions}
            loading={loadingSub}
            remaining={remaining}
            adding={adding}
            addedLabels={addedLabels}
            subQuery={subQuery}
            onSubQueryChange={setSubQuery}
            onChangeLevel={(level) => loadSubdivisions(selectedCountry, level)}
            onAddCountry={() => handleAddCountry(selectedCountry)}
            onAddSub={handleAddSubdivision}
            onAddAll={handleAddAllSubdivisions}
          />
        ) : (
          <CountryListView
            query={query}
            onQueryChange={setQuery}
            continent={continent}
            onContinentChange={setContinent}
            countries={filtered}
            loading={loading}
            error={error}
            remaining={remaining}
            adding={adding}
            addedLabels={addedLabels}
            onAdd={handleAddCountry}
            onSelect={(c) => loadSubdivisions(c, c.admLevels.length > 1 ? 1 : 0)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CountryListView({
  query,
  onQueryChange,
  continent,
  onContinentChange,
  countries,
  loading,
  error,
  remaining,
  adding,
  addedLabels,
  onAdd,
  onSelect,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  continent: string;
  onContinentChange: (c: string) => void;
  countries: GeoBankCountry[];
  loading: boolean;
  error: boolean;
  remaining: number;
  adding: string | null;
  addedLabels: Set<string>;
  onAdd: (c: GeoBankCountry) => void;
  onSelect: (c: GeoBankCountry) => void;
}) {
  return (
    <>
      <Input
        type="text"
        placeholder="Search countries..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        autoFocus
      />
      <div className="flex gap-1 flex-wrap">
        {CONTINENTS.map((c) => (
          <Button
            key={c}
            variant={continent === c ? "default" : "ghost"}
            size="sm"
            className="text-xs h-7 px-2"
            onClick={() => onContinentChange(c)}
          >
            {c}
          </Button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
        {loading && <p className="text-sm text-muted-foreground text-center py-4">Loading countries...</p>}
        {error && <p className="text-sm text-destructive text-center py-4">Failed to load countries</p>}
        {!loading && !error && countries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No countries found</p>
        )}
        {countries.map((c) => {
          const added = addedLabels.has(c.name);
          return (
            <div
              key={c.iso}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted group"
            >
              <button
                className="flex-1 text-left text-sm truncate flex items-center gap-1.5"
                onClick={() => onSelect(c)}
                title={`${c.name} (${c.iso}) — ${c.subregion}`}
              >
                {added && <FaCheck size={10} className="text-emerald-500 shrink-0" />}
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground text-xs">{c.iso}</span>
                {c.admLevels.length > 1 && (
                  <span className="text-muted-foreground text-xs">▸</span>
                )}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100"
                disabled={remaining <= 0 || adding === c.iso}
                onClick={(e) => { e.stopPropagation(); onAdd(c); }}
              >
                {adding === c.iso ? "…" : "+Add"}
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function SubdivisionView({
  country,
  admLevel,
  subdivisions,
  loading,
  remaining,
  adding,
  addedLabels,
  subQuery,
  onSubQueryChange,
  onChangeLevel,
  onAddCountry,
  onAddSub,
  onAddAll,
}: {
  country: GeoBankCountry;
  admLevel: number;
  subdivisions: GeoBankSubdivision[];
  loading: boolean;
  remaining: number;
  adding: string | null;
  addedLabels: Set<string>;
  subQuery: string;
  onSubQueryChange: (q: string) => void;
  onChangeLevel: (level: number) => void;
  onAddCountry: () => void;
  onAddSub: (sub: GeoBankSubdivision) => void;
  onAddAll: () => void;
}) {
  const filteredSubs = useMemo(() => {
    if (!subQuery.trim()) return subdivisions;
    const q = subQuery.toLowerCase();
    return subdivisions.filter((s) => s.name.toLowerCase().includes(q));
  }, [subdivisions, subQuery]);

  return (
    <>
      <div className="flex gap-1">
        {country.admLevels.map((level) => (
          <Button
            key={level}
            variant={admLevel === level ? "default" : "ghost"}
            size="sm"
            className="text-xs h-7 px-2"
            onClick={() => onChangeLevel(level)}
          >
            {level === 0 ? "Country" : `ADM${level}`}
          </Button>
        ))}
      </div>
      {admLevel === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-muted-foreground">Add the full country boundary</p>
          <Button
            variant="outline"
            size="sm"
            disabled={remaining <= 0 || adding === country.iso}
            onClick={onAddCountry}
          >
            {adding === country.iso ? "Loading..." : addedLabels.has(country.name) ? `✓ ${country.name} added` : `+Add ${country.name}`}
          </Button>
        </div>
      ) : loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading subdivisions...</p>
      ) : (
        <>
          <Input
            type="text"
            placeholder="Search subdivisions..."
            value={subQuery}
            onChange={(e) => onSubQueryChange(e.target.value)}
            autoFocus
          />
          {subdivisions.length > 0 && (
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground">{subdivisions.length} subdivisions</span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-6 px-2"
                disabled={remaining <= 0}
                onClick={onAddAll}
              >
                +Add all ({remaining === Infinity ? subdivisions.length : Math.min(subdivisions.length, remaining)})
              </Button>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
            {filteredSubs.map((sub) => {
              const added = addedLabels.has(sub.name);
              return (
                <button
                  key={sub.id}
                  className="flex items-center gap-1.5 w-full text-left px-2 py-1.5 rounded hover:bg-muted cursor-pointer disabled:opacity-50 disabled:cursor-default"
                  disabled={remaining <= 0}
                  onClick={() => onAddSub(sub)}
                >
                  {added && <FaCheck size={10} className="text-emerald-500 shrink-0" />}
                  <span className="text-sm truncate flex-1">{sub.name}</span>
                </button>
              );
            })}
            {filteredSubs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No subdivisions found</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
