"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorData, useDrawingState, useEditorActions } from "@/lib/editor-context";
import { serialize, deserialize } from "@/lib/mapmaker-format";
import PanelHeader from "@/components/ui/PanelHeader";
import { Button } from "@/components/ui/button";

export default function CodePanel({ onClose }: { onClose: () => void }) {
  const { map, layers, features } = useEditorData();
  const { activeBaseMap } = useDrawingState();
  const { importMapData } = useEditorActions();

  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const internalUpdate = useRef(false);

  useEffect(() => {
    if (internalUpdate.current) {
      internalUpdate.current = false;
      return;
    }
    setValue(serialize(map, layers, features, activeBaseMap.id));
    setError(null);
  }, [map, layers, features, activeBaseMap]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      setValue(raw);

      if (!raw.trim()) {
        setError(null);
        return;
      }

      try {
        const data = deserialize(raw);
        setError(null);
        internalUpdate.current = true;
        importMapData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid format");
      }
    },
    [importMapData]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <div className="h-full flex flex-col">
      <PanelHeader
        title="MapMaker JSON"
        onClose={onClose}
        action={
          <Button variant="ghost" size="sm" className="text-xs h-6" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        }
      />
      <div className="flex-1 relative">
        <textarea
          className="absolute inset-0 w-full h-full resize-none bg-background text-foreground text-xs font-mono p-3 focus:outline-none"
          value={value}
          onChange={handleChange}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      {error && (
        <div className="px-3 py-2 text-xs text-destructive bg-destructive/10 border-t">
          {error}
        </div>
      )}
    </div>
  );
}
