"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorData, useDrawingState, useEditorActions } from "@/lib/editor-context";
import { serialize, deserialize, geometrySchema } from "@/lib/mapmaker-format";
import { geometryTypeToFeatureType } from "@/lib/geojson";
import { FEATURE_LIMIT } from "@/lib/defaults";

const MAX_IMPORT_SIZE = 5_000_000;
const MAX_IMPORT_FEATURES = 500;
const MAX_LABEL_LENGTH = 200;

function sanitizeLabel(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, "").trim().slice(0, MAX_LABEL_LENGTH);
}
import PanelHeader from "@/components/ui/PanelHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Mode = "mapmaker" | "geojson";

export default function CodePanel({ onClose }: { onClose: () => void }) {
  const { map, layers, features, groups } = useEditorData();
  const { activeBaseMap } = useDrawingState();
  const { importMapData, addBankFeature } = useEditorActions();

  const [mode, setMode] = useState<Mode>("mapmaker");
  const [value, setValue] = useState("");
  const [geoValue, setGeoValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const internalUpdate = useRef(false);

  useEffect(() => {
    if (internalUpdate.current) {
      internalUpdate.current = false;
      return;
    }
    setValue(serialize(map, layers, features, activeBaseMap.id, groups));
    if (mode === "mapmaker") setError(null);
  }, [map, layers, features, groups, activeBaseMap, mode]);

  const handleMapmakerChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      setValue(raw);
      if (!raw.trim()) {
        setError(null);
        return;
      }
      try {
        const data = deserialize(raw);
        setError(null);
        internalUpdate.current = true;
        importMapData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid format");
      }
    },
    [importMapData]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    setError(null);
    setImportCount(null);
    if (m === "geojson") setGeoValue("");
  }, []);

  const handleImportGeoJSON = useCallback(() => {
    if (!geoValue.trim()) return;
    if (geoValue.length > MAX_IMPORT_SIZE) {
      setError(`GeoJSON too large (max ${Math.round(MAX_IMPORT_SIZE / 1_000_000)} MB)`);
      return;
    }
    try {
      const parsed = JSON.parse(geoValue);
      if (typeof parsed !== "object" || parsed === null) {
        setError("Invalid GeoJSON: expected an object");
        return;
      }
      const rawFeatures: unknown[] =
        parsed.type === "FeatureCollection" && Array.isArray(parsed.features)
          ? parsed.features.slice(0, MAX_IMPORT_FEATURES)
          : parsed.type === "Feature"
            ? [parsed]
            : [];
      if (rawFeatures.length === 0) {
        setError("No features found in GeoJSON");
        return;
      }
      const remaining = FEATURE_LIMIT - features.length;
      if (remaining <= 0) {
        setError(`Feature limit reached (${FEATURE_LIMIT})`);
        return;
      }
      const toImport = rawFeatures.slice(0, remaining);
      let added = 0;
      let skipped = 0;
      for (const raw of toImport) {
        if (typeof raw !== "object" || raw === null) { skipped++; continue; }
        const f = raw as Record<string, unknown>;
        if (f.type !== "Feature" || !f.geometry) { skipped++; continue; }
        const geomResult = geometrySchema.safeParse(f.geometry);
        if (!geomResult.success) { skipped++; continue; }
        const geometry = geomResult.data as GeoJSON.Geometry;
        const fType = geometryTypeToFeatureType(geometry.type);
        if (fType !== "point" && fType !== "polyline" && fType !== "polygon") { skipped++; continue; }
        const props = (typeof f.properties === "object" && f.properties !== null ? f.properties : {}) as Record<string, unknown>;
        const label = sanitizeLabel(props.name || props.shapeName || props.NAME || props.label || "");
        addBankFeature(geometry, label, "GeoJSON import");
        added++;
      }
      if (added > 0) {
        setError(skipped > 0 ? `${added} imported, ${skipped} skipped (invalid geometry)` : null);
        setImportCount(added);
        setGeoValue("");
      } else {
        setError("No valid geometries found");
      }
    } catch {
      setError("Invalid JSON");
    }
  }, [geoValue, addBankFeature, features.length]);

  return (
    <div className="h-full flex flex-col">
      <PanelHeader
        title={mode === "mapmaker" ? "MapMaker JSON" : "Import GeoJSON"}
        onClose={onClose}
        action={
          mode === "mapmaker" ? (
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          ) : null
        }
      />
      <div className="flex border-b">
        <button
          className={`flex-1 text-xs py-1.5 ${mode === "mapmaker" ? "bg-background font-medium" : "bg-muted text-muted-foreground"}`}
          onClick={() => switchMode("mapmaker")}
        >
          MapMaker
        </button>
        <button
          className={`flex-1 text-xs py-1.5 ${mode === "geojson" ? "bg-background font-medium" : "bg-muted text-muted-foreground"}`}
          onClick={() => switchMode("geojson")}
        >
          Import GeoJSON
        </button>
      </div>
      {mode === "mapmaker" ? (
        <div className="flex-1 relative">
          <Textarea
            className="absolute inset-0 w-full h-full resize-none rounded-none border-0 shadow-none text-xs font-mono p-3 focus-visible:ring-0"
            value={value}
            onChange={handleMapmakerChange}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            <Textarea
              className="absolute inset-0 w-full h-full resize-none rounded-none border-0 shadow-none text-xs font-mono p-3 focus-visible:ring-0"
              value={geoValue}
              onChange={(e) => { setGeoValue(e.target.value); setError(null); setImportCount(null); }}
              placeholder='Paste a GeoJSON FeatureCollection or Feature here...'
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="px-3 py-2 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {importCount !== null ? `${importCount} feature${importCount > 1 ? "s" : ""} imported` : "Paste then import"}
            </span>
            <Button
              size="sm"
              className="text-xs h-7"
              disabled={!geoValue.trim()}
              onClick={handleImportGeoJSON}
            >
              Import
            </Button>
          </div>
        </div>
      )}
      {error && (
        <div className="px-3 py-2 text-xs text-destructive bg-destructive/10 border-t">
          {error}
        </div>
      )}
    </div>
  );
}
