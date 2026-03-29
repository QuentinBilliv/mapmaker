"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import FileDropZone from "@/components/ui/FileDropZone";
import { sanitizeSvg } from "@/lib/svg-sanitizer";

export default function CustomSvgDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (svg: string) => void;
}) {
  const [pasteValue, setPasteValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (raw: string) => {
    try {
      const sanitized = sanitizeSvg(raw);
      onSubmit(sanitized);
      onOpenChange(false);
      setPasteValue("");
      setError(null);
    } catch {
      setError("Invalid SVG");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setError(null); setPasteValue(""); } }}>
      <DialogContent className="max-w-sm flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Custom SVG</DialogTitle>
        </DialogHeader>
        <FileDropZone
          accept=".svg"
          maxSizeKB={256}
          label="Drop an SVG file or click to browse"
          onFile={submit}
          onError={setError}
        />
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Paste SVG markup..."
            value={pasteValue}
            onChange={(e) => { setPasteValue(e.target.value); setError(null); }}
            rows={4}
            className="font-mono text-xs"
          />
          <Button size="sm" disabled={!pasteValue.trim()} onClick={() => submit(pasteValue)}>
            Apply
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
