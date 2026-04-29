"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import FileDropZone from "@/components/ui/FileDropZone";

type ImportMode = "replace" | "add";

interface PendingImport {
  content: string;
  isIdomap: boolean;
  fileName: string;
}

export default function ImportDialog({
  open,
  onOpenChange,
  onImport,
  hasFeatures,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (content: string, isIdomap: boolean, mode: ImportMode) => void;
  hasFeatures: boolean;
}) {
  const [pasteValue, setPasteValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);

  const reset = () => {
    setPasteValue("");
    setError(null);
    setPending(null);
  };

  const submit = (raw: string, fileName: string) => {
    const isIdomap = fileName.endsWith(".idomaps");

    if (isIdomap) {
      onImport(raw, true, "replace");
      onOpenChange(false);
      reset();
      return;
    }

    try {
      JSON.parse(raw);
    } catch {
      setError("Invalid JSON");
      return;
    }

    if (hasFeatures) {
      setPending({ content: raw, isIdomap: false, fileName });
    } else {
      onImport(raw, false, "add");
      onOpenChange(false);
      reset();
    }
  };

  const confirmMode = (mode: ImportMode) => {
    if (!pending) return;
    onImport(pending.content, pending.isIdomap, mode);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-sm flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{pending ? "Import GeoJSON" : "Import"}</DialogTitle>
        </DialogHeader>
        {pending ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Your map already has features. Would you like to add the imported features or replace the existing ones?
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => confirmMode("add")}>
                Add
              </Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => confirmMode("replace")}>
                Replace
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Back
            </Button>
          </div>
        ) : (
          <>
            <FileDropZone
              accept=".idomaps,.geojson,.json"
              maxSizeKB={5000}
              label="Drop a .idomaps or .geojson file"
              onFile={(content, fileName) => submit(content, fileName ?? "import.geojson")}
              onError={setError}
            />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Paste GeoJSON..."
                value={pasteValue}
                onChange={(e) => { setPasteValue(e.target.value); setError(null); }}
                rows={6}
                className="font-mono text-xs"
              />
              <Button size="sm" disabled={!pasteValue.trim()} onClick={() => submit(pasteValue, "pasted.geojson")}>
                Import
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
