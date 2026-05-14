"use client";

import { useState, useCallback } from "react";
import { useEditorData, useDrawingState, useEditorActions } from "@/lib/editor-context";
import { serialize, deserialize, migrateIconsToSvg, geometrySchema } from "@/lib/idomaps-format";
import { geometryTypeToFeatureType } from "@/lib/geojson";
import { Button } from "@/components/ui/button";
import { FaDownload, FaUpload } from "react-icons/fa6";
import ImportDialog from "@/components/editor/ImportDialog";
import toast from "react-hot-toast";

const MAX_IMPORT_FEATURES = 500;
const MAX_LABEL_LENGTH = 200;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function sanitizeLabel(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, "").trim().slice(0, MAX_LABEL_LENGTH);
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

export default function ExportImportButtons() {
  const { map, features, groups, legendEntries, choropleth, featureLimit } = useEditorData();
  const { activeBaseMap, styleOptions } = useDrawingState();
  const { importMapData, addBankFeature, clearAllFeatures, addLegendEntry } = useEditorActions();
  const [status, setStatus] = useState<{ message: string; error: boolean } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleExport = useCallback(() => {
    const json = serialize(map, features, activeBaseMap.id, groups, legendEntries, choropleth, styleOptions);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(map.title || "map").replace(/[^a-zA-Z0-9_-]/g, "_")}.idomaps`;
    a.click();
    URL.revokeObjectURL(url);
  }, [map, features, activeBaseMap, groups, legendEntries, choropleth]);

  const handleImport = useCallback(async (content: string, isIdomap: boolean, mode: "replace" | "add") => {
    if (isIdomap) {
      try {
        const data = deserialize(content);
        await migrateIconsToSvg(data);
        importMapData(data);
        setStatus({ message: "Map imported", error: false });
        if (data.droppedFeatureCount > 0) {
          toast(`${data.droppedFeatureCount} feature${data.droppedFeatureCount > 1 ? "s" : ""} skipped (invalid format)`);
        }
      } catch (err) {
        console.error("idomaps import error:", err);
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
      const legendByKey = new Map<string, string>();
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
        let color: string | undefined;
        if (typeof props.color === "string" && HEX_COLOR_RE.test(props.color)) color = props.color;
        else if (typeof props.fill === "string" && HEX_COLOR_RE.test(props.fill)) color = props.fill;
        const description = typeof props.description === "string" ? props.description.slice(0, 500) : undefined;
        const imageUrl = typeof props.imageUrl === "string" && isHttpUrl(props.imageUrl) ? props.imageUrl.slice(0, 500) : undefined;
        let legendEntryId: string | undefined;
        if (color && fType === "polygon") {
          const levelRaw = typeof props.level === "string" ? props.level.toLowerCase() : "";
          const legendLabel = typeof props.legendLabel === "string" ? sanitizeLabel(props.legendLabel)
            : levelRaw ? levelRaw.charAt(0).toUpperCase() + levelRaw.slice(1)
            : color;
          const key = `${color}|${legendLabel}`;
          legendEntryId = legendByKey.get(key);
          if (!legendEntryId) {
            legendEntryId = addLegendEntry({
              featureType: "polygon",
              label: legendLabel,
              color,
              opacity: 0.7,
              smoothing: 0,
              strokeWidth: 3,
              lineStyle: "solid",
              lineDecoration: "none",
              decorationSpacing: 50,
              fillPattern: "none",
            });
            legendByKey.set(key, legendEntryId);
          }
        }
        addBankFeature(geometry, label, { color, description, imageUrl, legendEntryId });
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
  }, [importMapData, addBankFeature, clearAllFeatures, features.length, featureLimit, addLegendEntry]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs bg-background/80 backdrop-blur-sm"
        onClick={handleExport}
        title="Download .idomaps"
      >
        <FaDownload className="w-3 h-3 mr-1" />
        Export
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-xs bg-background/80 backdrop-blur-sm"
        onClick={() => setImportDialogOpen(true)}
        title="Import .idomaps or GeoJSON"
      >
        <FaUpload className="w-3 h-3 mr-1" />
        Import
      </Button>
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        hasFeatures={features.length > 0}
        maxSizeKB={featureLimit === Infinity ? 51200 : 5000}
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
