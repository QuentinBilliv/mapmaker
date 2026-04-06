"use client";

import { useState, useCallback } from "react";
import { useEditorData, useDrawingState, useEditorActions } from "@/lib/editor-context";
import { serialize, deserialize, migrateIconsToSvg, geometrySchema } from "@/lib/mapmaker-format";
import { geometryTypeToFeatureType } from "@/lib/geojson";
import { Button } from "@/components/ui/button";
import { FaDownload, FaUpload } from "react-icons/fa6";
import ImportDialog from "@/components/editor/ImportDialog";

const MAX_IMPORT_FEATURES = 500;
const MAX_LABEL_LENGTH = 200;

function sanitizeLabel(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, "").trim().slice(0, MAX_LABEL_LENGTH);
}

export default function ExportImportButtons() {
  const { map, features, groups, legendEntries, choropleth, featureLimit } = useEditorData();
  const { activeBaseMap } = useDrawingState();
  const { importMapData, addBankFeature, clearAllFeatures } = useEditorActions();
  const [status, setStatus] = useState<{ message: string; error: boolean } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleExport = useCallback(() => {
    const json = serialize(map, features, activeBaseMap.id, groups, legendEntries, choropleth);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(map.title || "map").replace(/[^a-zA-Z0-9_-]/g, "_")}.mapmaker`;
    a.click();
    URL.revokeObjectURL(url);
  }, [map, features, activeBaseMap, groups, legendEntries]);

  const handleImport = useCallback(async (content: string, isMapmaker: boolean, mode: "replace" | "add") => {
    if (isMapmaker) {
      try {
        const data = deserialize(content);
        await migrateIconsToSvg(data);
        importMapData(data);
        setStatus({ message: "Map imported", error: false });
      } catch (err) {
        console.error("MapMaker import error:", err);
        setStatus({ message: err instanceof Error ? err.message : "Invalid file", error: true });
      }
      return;
    }

    try {
      const parsed = JSON.parse(content);
      if (typeof parsed !== "object" || parsed === null) {
        setStatus({ message: "Invalid GeoJSON", error: true });
        return;
      }
      const rawFeatures: unknown[] =
        parsed.type === "FeatureCollection" && Array.isArray(parsed.features)
          ? parsed.features.slice(0, MAX_IMPORT_FEATURES)
          : parsed.type === "Feature"
            ? [parsed]
            : [];
      if (rawFeatures.length === 0) {
        setStatus({ message: "No features found", error: true });
        return;
      }

      if (mode === "replace") clearAllFeatures();

      const currentCount = mode === "replace" ? 0 : features.length;
      const remaining = featureLimit === Infinity ? Infinity : featureLimit - currentCount;
      if (remaining <= 0) {
        setStatus({ message: `Feature limit reached (${featureLimit})`, error: true });
        return;
      }
      const toImport = remaining === Infinity ? rawFeatures : rawFeatures.slice(0, remaining);
      let added = 0;
      for (const item of toImport) {
        if (typeof item !== "object" || item === null) continue;
        const f = item as Record<string, unknown>;
        if (f.type !== "Feature" || !f.geometry) continue;
        const geomResult = geometrySchema.safeParse(f.geometry);
        if (!geomResult.success) continue;
        const geometry = geomResult.data as GeoJSON.Geometry;
        const fType = geometryTypeToFeatureType(geometry.type);
        if (fType !== "point" && fType !== "polyline" && fType !== "polygon") continue;
        const props = (typeof f.properties === "object" && f.properties !== null ? f.properties : {}) as Record<string, unknown>;
        const label = sanitizeLabel(props.name || props.shapeName || props.NAME || props.label || "");
        addBankFeature(geometry, label);
        added++;
      }
      if (added > 0) {
        setStatus({ message: `${added} feature${added > 1 ? "s" : ""} imported`, error: false });
      } else {
        setStatus({ message: "No valid geometries found", error: true });
      }
    } catch (err) {
      console.error("GeoJSON import error:", err);
      setStatus({ message: "Invalid JSON file", error: true });
    }
  }, [importMapData, addBankFeature, clearAllFeatures, features.length, featureLimit]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs bg-background/80 backdrop-blur-sm"
        onClick={handleExport}
        title="Download .mapmaker"
      >
        <FaDownload className="w-3 h-3 mr-1" />
        Export
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-xs bg-background/80 backdrop-blur-sm"
        onClick={() => setImportDialogOpen(true)}
        title="Import .mapmaker or GeoJSON"
      >
        <FaUpload className="w-3 h-3 mr-1" />
        Import
      </Button>
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        hasFeatures={features.length > 0}
      />
      {status && (
        <div
          className={`absolute top-12 right-0 text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap ${
            status.error ? "bg-destructive text-destructive-foreground" : "bg-popover text-foreground"
          }`}
          onClick={() => setStatus(null)}
        >
          {status.message}
        </div>
      )}
    </>
  );
}
