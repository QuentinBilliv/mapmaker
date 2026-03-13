"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { loadAllPacks, PACKS, type CatalogEntry } from "@/lib/icon-catalog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COLS = 6;
const ROW_H = 44;
const BUFFER_ROWS = 6;

export default function IconPickerDialog({
  open,
  onOpenChange,
  selected,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (open && catalog.length === 0 && !loadError) {
      loadAllPacks()
        .then(setCatalog)
        .catch(() => setLoadError(true));
    }
  }, [open, catalog.length, loadError]);

  const filtered = useMemo(() => {
    if (!query.trim()) return catalog;
    const q = query.toLowerCase();
    return catalog.filter(
      (e) => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)
    );
  }, [query, catalog]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose an icon</DialogTitle>
        </DialogHeader>
        <div className="flex gap-1 text-xs flex-wrap">
          {PACKS.map((p) => (
            <span key={p.id} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {p.label}
            </span>
          ))}
        </div>
        <Input
          type="text"
          placeholder="Search across all packs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="flex-1 min-h-0">
          {loadError ? (
            <p className="text-sm text-destructive text-center py-4">Failed to load icons</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : (
            <VirtualIconGrid
              entries={filtered}
              selected={selected}
              onSelect={(id) => { onSelect(id); onOpenChange(false); }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VirtualIconGrid({
  entries,
  selected,
  onSelect,
}: {
  entries: CatalogEntry[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, []);

  useEffect(() => {
    setScrollTop(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [entries]);

  const totalRows = Math.ceil(entries.length / COLS);
  const totalHeight = totalRows * ROW_H;

  const containerHeight = scrollRef.current?.clientHeight ?? 400;
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER_ROWS);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / ROW_H) + BUFFER_ROWS);

  const visibleEntries = entries.slice(startRow * COLS, endRow * COLS);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No icons found</p>;
  }

  return (
    <div ref={scrollRef} onScroll={onScroll} className="overflow-y-auto h-full">
      <div style={{ height: totalHeight, paddingTop: startRow * ROW_H }} className="relative">
        <div className="grid grid-cols-6 gap-1">
          {visibleEntries.map((e) => (
            <Button
              key={e.id}
              variant={selected === e.id ? "default" : "ghost"}
              size="icon"
              onClick={() => onSelect(e.id)}
              title={`${e.name} (${e.pack})`}
            >
              <e.Icon size={18} />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
