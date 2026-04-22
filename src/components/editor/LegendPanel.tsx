"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { FeatureSwatch } from "@/components/ui/feature-swatch";
import { CreateEntryDialog, EditEntryDialog } from "@/components/ui/legend-display";
import { legendEntryToSyntheticFeature } from "@/lib/resolve-style";
import { Button } from "@/components/ui/button";
import { FaTrash, FaListUl } from "react-icons/fa6";
import { useHighlight } from "@/lib/highlight-context";
import HelpHint from "@/components/ui/HelpHint";
import LegendHelp from "@/components/help/Legend";

export default function LegendPanel() {
  const { legendEntries } = useEditorData();
  const { addLegendEntry, updateLegendEntry, deleteLegendEntry, reorderLegendEntries } = useEditorActions();
  const { setHoveredLegendEntryId } = useHighlight();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragOverGap, setDragOverGap] = useState<number | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  const onLegendMouseMove = useCallback((e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-legend-id]");
    setHoveredLegendEntryId(el?.dataset.legendId ?? null);
  }, [setHoveredLegendEntryId]);

  const onLegendMouseLeave = useCallback(() => {
    setHoveredLegendEntryId(null);
  }, [setHoveredLegendEntryId]);

  useEffect(() => {
    const handler = () => setDialogOpen(true);
    window.addEventListener("idomap:open-legend-create", handler);
    return () => window.removeEventListener("idomap:open-legend-create", handler);
  }, []);

  const sorted = [...legendEntries].sort((a, b) => a.order - b.order);
  const editingEntry = editingId ? legendEntries.find((e) => e.id === editingId) : null;

  function onRowDragOver(e: React.DragEvent, gapBefore: number, gapAfter: number) {
    e.preventDefault();
    if (!draggedIdRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverGap(e.clientY < midY ? gapBefore : gapAfter);
  }

  function onRowDrop(e: React.DragEvent, gapBefore: number, gapAfter: number) {
    const id = draggedIdRef.current;
    draggedIdRef.current = null;
    setDragOverGap(null);
    if (!id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIdx = e.clientY < midY ? gapBefore : gapAfter;
    const orderedIds = sorted.map((x) => x.id);
    const fromIdx = orderedIds.indexOf(id);
    if (fromIdx === -1) return;
    orderedIds.splice(fromIdx, 1);
    const adj = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
    orderedIds.splice(adj, 0, id);
    reorderLegendEntries(orderedIds);
  }

  return (
    <div className="border-t flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b shrink-0">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <FaListUl className="w-3.5 h-3.5" />
          Legend
          <HelpHint help={LegendHelp} />
        </h3>
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
          {sorted.map((entry, i) => (
            <div key={entry.id}>
              {dragOverGap === i && <div className="h-0.5 bg-primary" />}
              <div
                data-legend-id={entry.id}
                draggable
                onDragStart={() => { draggedIdRef.current = entry.id; }}
                onDragOver={(e) => onRowDragOver(e, i, i + 1)}
                onDrop={(e) => onRowDrop(e, i, i + 1)}
                onDragEnd={() => { draggedIdRef.current = null; setDragOverGap(null); }}
                onClick={() => setEditingId(entry.id)}
                className="group/row flex items-center gap-2 px-3 py-1.5 cursor-grab text-sm border-b last:border-b-0 hover:bg-muted hover:ring-1 hover:ring-primary/40"
              >
                <FeatureSwatch feature={legendEntryToSyntheticFeature(entry)} width={36} height={22} />
                <span className="flex-1 truncate text-xs">{entry.label || "Untitled"}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteLegendEntry(entry.id); }}
                  className="text-muted-foreground hover:text-destructive shrink-0 p-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <FaTrash className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          ))}
          {dragOverGap === sorted.length && <div className="h-0.5 bg-primary" />}
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
