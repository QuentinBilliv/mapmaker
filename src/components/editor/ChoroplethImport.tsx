"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FaXmark, FaArrowUpFromBracket } from "react-icons/fa6";
import { loadTileLayerGeoJSON, getRegionList, getTileLayerConfig, type RegionInfo } from "@/lib/choropleth";
import type { TileLayerId } from "@/lib/types";
import toast from "react-hot-toast";

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-");
}

function buildIdLookup(validIds: Set<string>): (key: string) => string | null {
  const byNorm = new Map<string, string>();
  Array.from(validIds).forEach((id) => byNorm.set(normalizeKey(id), id));
  return (key: string) => validIds.has(key) ? key : (byNorm.get(normalizeKey(key)) ?? null);
}

export interface ParsedChoroplethImport {
  categories: { label: string; color: string; countries: string[] }[];
  descriptions: Record<string, string>;
  imageUrls: Record<string, string>;
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function parseImportData(
  raw: string,
  validIds: Set<string>,
): { ok: true; data: ParsedChoroplethImport; message: string } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  const resolve = buildIdLookup(validIds);
  const descriptions: Record<string, string> = {};
  const imageUrls: Record<string, string> = {};
  if (Array.isArray(parsed)) {
    const result: { label: string; color: string; countries: string[] }[] = [];
    for (const item of parsed) {
      if (!item.label || !item.color || !Array.isArray(item.countries)) {
        return { ok: false, error: "Each item needs label, color, and countries array" };
      }
      const valid: string[] = [];
      for (const entry of item.countries) {
        let id: string | null = null;
        let description: string | undefined;
        let imageUrl: string | undefined;
        if (typeof entry === "string") {
          id = resolve(entry);
        } else if (entry && typeof entry === "object" && typeof entry.id === "string") {
          id = resolve(entry.id);
          if (typeof entry.description === "string") description = entry.description.slice(0, 500);
          if (typeof entry.imageUrl === "string" && isHttpUrl(entry.imageUrl)) imageUrl = entry.imageUrl.slice(0, 500);
        }
        if (!id) continue;
        valid.push(id);
        if (description) descriptions[id] = description;
        if (imageUrl) imageUrls[id] = imageUrl;
      }
      if (valid.length > 0) result.push({ label: item.label, color: item.color, countries: valid });
    }
    if (result.length === 0) return { ok: false, error: "No valid categories found" };
    return { ok: true, data: { categories: result, descriptions, imageUrls }, message: `Imported ${result.length} ${result.length === 1 ? "category" : "categories"}` };
  }
  if (typeof parsed === "object" && parsed !== null) {
    const byColor = new Map<string, string[]>();
    let count = 0;
    for (const [key, color] of Object.entries(parsed)) {
      if (typeof color !== "string") continue;
      const id = resolve(key);
      if (!id) continue;
      if (!byColor.has(color)) byColor.set(color, []);
      byColor.get(color)!.push(id);
      count++;
    }
    if (count === 0) return { ok: false, error: "No valid region IDs found" };
    const result: { label: string; color: string; countries: string[] }[] = [];
    let idx = 1;
    byColor.forEach((ids, color) => {
      result.push({ label: `Category ${idx++}`, color, countries: ids });
    });
    return { ok: true, data: { categories: result, descriptions, imageUrls }, message: `Imported ${count} ${count === 1 ? "region" : "regions"} in ${result.length} ${result.length === 1 ? "category" : "categories"}` };
  }
  return { ok: false, error: "Expected a JSON array or object" };
}

function parseGradientImportData(
  raw: string,
  validIds: Set<string>,
): { ok: true; data: Record<string, number>; message: string } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Expected a JSON object mapping region IDs to numbers" };
  }
  const resolve = buildIdLookup(validIds);
  const result: Record<string, number> = {};
  let count = 0;
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "number" || isNaN(value)) continue;
    const id = resolve(key);
    if (!id) continue;
    result[id] = value;
    count++;
  }
  if (count === 0) return { ok: false, error: "No valid region IDs with numeric values found" };
  return { ok: true, data: result, message: `Imported ${count} ${count === 1 ? "region" : "regions"}` };
}

const SAMPLE_IDS: Record<TileLayerId, [string, string]> = {
  countries: ["France", "Germany"],
  "us-states": ["CA", "NY"],
  "canada-provinces": ["QC", "ON"],
  "france-departements": ["75", "13"],
  "eu-nuts2": ["FR10", "DE30"],
  "china-provinces": ["Beijing", "Shanghai"],
  "india-states": ["Maharashtra", "Kerala"],
  "russia-regions": ["Moscow Oblast", "Republic of Tatarstan"],
};

function ImportDialogBase({
  tileLayer,
  title,
  hint,
  onClose,
  parse,
}: {
  tileLayer: TileLayerId;
  title: string;
  hint: React.ReactNode;
  onClose: () => void;
  parse: (raw: string, validIds: Set<string>) => { ok: true; data: unknown; message: string } | { ok: false; error: string };
}) {
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [countries, setCountries] = useState<RegionInfo[]>([]);

  useEffect(() => {
    loadTileLayerGeoJSON(tileLayer).then((geojson) => {
      setCountries(getRegionList(geojson, getTileLayerConfig(tileLayer)));
    }).catch(() => {
      toast.error("Failed to load regions");
    });
  }, [tileLayer]);

  const validIsos = useMemo(() => new Set(countries.map((c) => c.id)), [countries]);

  const processText = useCallback((raw: string) => {
    const result = parse(raw, validIsos);
    if (!result.ok) { toast.error(result.error); return null; }
    toast.success(result.message);
    onClose();
    return result.data;
  }, [validIsos, parse, onClose]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return false; }
    if (!file.name.endsWith(".json") && file.type !== "application/json" && !file.name.endsWith(".txt") && file.type !== "text/plain") { toast.error("Drop a .json or .txt file"); return false; }
    return true;
  }, []);

  const readAndProcess = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => { const c = reader.result as string; setText(c); processText(c); };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  }, [processText]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !validateFile(file)) return;
    readAndProcess(file);
  }, [validateFile, readAndProcess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-popover rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <FaXmark className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground space-y-1.5">{hint}</div>
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 transition-colors cursor-pointer ${
            dragging ? "border-primary bg-primary/5" : "border-input hover:border-muted-foreground"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <FaArrowUpFromBracket className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Drop a .json file or click to browse</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,application/json,text/plain"
            onChange={(e) => { const f = e.target.files?.[0]; if (f && validateFile(f)) readAndProcess(f); }}
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
        <Button size="sm" className="w-full text-xs" onClick={() => processText(text)} disabled={!text.trim()}>
          Import
        </Button>
      </div>
    </div>
  );
}

export function ImportDialog({
  tileLayer,
  onClose,
  onImport,
}: {
  tileLayer: TileLayerId;
  onClose: () => void;
  onImport: (data: ParsedChoroplethImport) => void;
}) {
  const samples = SAMPLE_IDS[tileLayer] ?? SAMPLE_IDS.countries;
  const parse = useCallback((raw: string, validIds: Set<string>) => parseImportData(raw, validIds), []);
  return (
    <ImportDialogBase
      tileLayer={tileLayer}
      title="Import Choropleth"
      onClose={onClose}
      parse={(raw, validIds) => {
        const result = parse(raw, validIds);
        if (result.ok) onImport(result.data);
        return result;
      }}
      hint={<>
        <p>Grouped format. Each country can be a string, or an object with optional <code>description</code> and <code>imageUrl</code>:</p>
        <pre className="bg-muted p-2 rounded text-[10px] overflow-x-auto">
{`[
  { "label": "Group A", "color": "#3b82f6",
    "countries": [
      { "id": "${samples[0]}",
        "description": "Optional text",
        "imageUrl": "https://..." },
      "${samples[1]}"
    ] }
]`}
        </pre>
        <p>Or flat format (auto-groups by color):</p>
        <pre className="bg-muted p-2 rounded text-[10px]">
{`{ "${samples[0]}": "#3b82f6", "${samples[1]}": "#3b82f6" }`}
        </pre>
      </>}
    />
  );
}

export function GradientImportDialog({
  tileLayer,
  onClose,
  onImport,
}: {
  tileLayer: TileLayerId;
  onClose: () => void;
  onImport: (data: Record<string, number>) => void;
}) {
  const samples = SAMPLE_IDS[tileLayer] ?? SAMPLE_IDS.countries;
  const parse = useCallback((raw: string, validIds: Set<string>) => parseGradientImportData(raw, validIds), []);
  return (
    <ImportDialogBase
      tileLayer={tileLayer}
      title="Import Gradient Values"
      onClose={onClose}
      parse={(raw, validIds) => {
        const result = parse(raw, validIds);
        if (result.ok) onImport(result.data);
        return result;
      }}
      hint={<>
        <p>Map region IDs to numeric values:</p>
        <pre className="bg-muted p-2 rounded text-[10px] overflow-x-auto">
{`{
  "${samples[0]}": 0.9764,
  "${samples[1]}": 0.2264,
  "...": 0.333
}`}
        </pre>
      </>}
    />
  );
}
