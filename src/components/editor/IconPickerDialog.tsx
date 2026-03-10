"use client";

import { useState, useMemo, useEffect } from "react";
import { loadCatalog, type CatalogEntry } from "@/lib/icon-catalog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  useEffect(() => {
    if (open && catalog.length === 0) {
      loadCatalog().then(setCatalog);
    }
  }, [open, catalog.length]);

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
        <Input
          type="text"
          placeholder="Search icons..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="overflow-y-auto flex-1 mt-2">
          {catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : (
            <IconGrid
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

function IconGrid({
  entries,
  selected,
  onSelect,
}: {
  entries: CatalogEntry[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No icons found</p>;
  }

  return (
    <div className="grid grid-cols-6 gap-1">
      {entries.map((e) => (
        <Button
          key={e.id}
          variant={selected === e.id ? "default" : "ghost"}
          size="icon"
          onClick={() => onSelect(e.id)}
          title={e.name}
        >
          <e.Icon size={18} />
        </Button>
      ))}
    </div>
  );
}
