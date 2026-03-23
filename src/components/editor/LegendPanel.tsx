"use client";

import { useState, useEffect, useCallback } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { FeatureSwatch } from "@/components/ui/feature-swatch";
import { CreateEntryDialog, EditEntryDialog } from "@/components/ui/legend-display";
import { legendEntryToSyntheticFeature } from "@/lib/resolve-style";
import { Button } from "@/components/ui/button";
import { FaTrash, FaPen } from "react-icons/fa6";
import { useHighlight } from "@/lib/highlight-context";

export default function LegendPanel() {
  const { legendEntries } = useEditorData();
  const { addLegendEntry, updateLegendEntry, deleteLegendEntry } = useEditorActions();
  const { setHoveredLegendEntryId } = useHighlight();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const onLegendMouseMove = useCallback((e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-legend-id]");
    setHoveredLegendEntryId(el?.dataset.legendId ?? null);
  }, [setHoveredLegendEntryId]);

  const onLegendMouseLeave = useCallback(() => {
    setHoveredLegendEntryId(null);
  }, [setHoveredLegendEntryId]);

  useEffect(() => {
    const handler = () => setDialogOpen(true);
    window.addEventListener("mapmaker:open-legend-create", handler);
    return () => window.removeEventListener("mapmaker:open-legend-create", handler);
  }, []);

  const sorted = [...legendEntries].sort((a, b) => a.order - b.order);
  const editingEntry = editingId ? legendEntries.find((e) => e.id === editingId) : null;

  return (
    <div className="border-t flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Legend</h3>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setDialogOpen(true)}
          title="Add legend entry"
        >
          +
        </Button>
      </div>
      {sorted.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted-foreground text-center">
          No legend entries. Click + to add one.
        </p>
      ) : (
        <div className="overflow-y-auto max-h-48" onMouseMove={onLegendMouseMove} onMouseLeave={onLegendMouseLeave}>
          {sorted.map((entry) => (
            <div
              key={entry.id}
              data-legend-id={entry.id}
              className="group/row flex items-center gap-2 px-3 py-1.5 text-sm border-b last:border-b-0 hover:bg-muted hover:ring-1 hover:ring-primary/40 hover:rounded"
            >
              <FeatureSwatch feature={legendEntryToSyntheticFeature(entry)} width={36} height={22} />
              <span className="flex-1 truncate text-xs">{entry.label || "Untitled"}</span>
              <button
                onClick={() => setEditingId(entry.id)}
                className="text-muted-foreground hover:text-foreground shrink-0 p-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
                title="Edit"
              >
                <FaPen className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => deleteLegendEntry(entry.id)}
                className="text-muted-foreground hover:text-destructive shrink-0 p-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
                title="Delete"
              >
                <FaTrash className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <CreateEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(entry) => { addLegendEntry(entry); setDialogOpen(false); }}
      />
      {editingEntry && (
        <EditEntryDialog
          open={!!editingEntry}
          onOpenChange={(v) => { if (!v) setEditingId(null); }}
          entry={editingEntry}
          onUpdate={(updates) => updateLegendEntry(editingEntry.id, updates)}
        />
      )}
    </div>
  );
}
