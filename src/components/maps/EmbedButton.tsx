"use client";

import { useState } from "react";
import { FaCode } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

export function EmbedButton({ mapId }: { mapId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = `<iframe src="${typeof window !== "undefined" ? window.location.origin : "https://mapmaker.dev"}/embed/${mapId}" width="100%" height="450" style="border:none;border-radius:8px" allowfullscreen></iframe>`;

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
