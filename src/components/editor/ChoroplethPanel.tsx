"use client";

import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { Button } from "@/components/ui/button";
import { FaEarthAmericas } from "react-icons/fa6";

interface ChoroplethPanelProps {
  onOpenDialog: () => void;
}

export default function ChoroplethPanel({ onOpenDialog }: ChoroplethPanelProps) {
  const { choropleth } = useEditorData();
  const { setChoropleth } = useEditorActions();
  const assignmentCount = choropleth.mode === "gradient"
    ? Object.keys(choropleth.values ?? {}).length
    : Object.keys(choropleth.assignments ?? {}).length;

  return (
    <div className="border-t flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b shrink-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <FaEarthAmericas className="w-3.5 h-3.5" />
          Choropleth
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="text-xs text-muted-foreground">{choropleth.enabled ? "On" : "Off"}</span>
          <input
            type="checkbox"
            checked={choropleth.enabled}
            onChange={() => setChoropleth({ enabled: !choropleth.enabled })}
            className="w-4 h-4 accent-primary"
          />
        </label>
      </div>
      {choropleth.enabled && (
        <div className="px-3 py-2 space-y-2">
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={onOpenDialog}
          >
            Set values
          </Button>
          {assignmentCount > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {choropleth.mode === "gradient"
                ? `${assignmentCount} ${assignmentCount === 1 ? "region" : "regions"}`
                : `${choropleth.categories.length} ${choropleth.categories.length === 1 ? "category" : "categories"} · ${assignmentCount} ${assignmentCount === 1 ? "region" : "regions"}`
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
}
