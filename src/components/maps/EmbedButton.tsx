"use client";

import { useState } from "react";
import { FaCode } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

export function EmbedButton({ mapId }: { mapId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://idomaps.app";
  const snippet = `<iframe src="${origin}/embed/${mapId}" width="100%" height="450" style="border:none;border-radius:8px" allowfullscreen></iframe>
<p style="font:12px/1.4 system-ui,sans-serif;margin:6px 0 0;color:#6b7280">Interactive map made with <a href="https://idomaps.app" target="_blank" rel="noopener">idomaps</a></p>`;

  function handleCopy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-[10px] h-5 px-1.5"
        onClick={() => setOpen((v) => !v)}
      >
        <FaCode className="w-3 h-3 mr-1" />
        Embed
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-50 w-80 bg-popover border rounded-lg shadow-lg p-3">
            <p className="text-xs font-medium mb-2">Embed this map</p>
            <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {snippet}
            </pre>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Includes a small credit link — please keep it to support idomaps.
            </p>
            <Button
              size="sm"
              className="w-full mt-2 text-xs h-7"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy to clipboard"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
