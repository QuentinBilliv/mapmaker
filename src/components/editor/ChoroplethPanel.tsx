"use client";

import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { Button } from "@/components/ui/button";
import HelpHint from "@/components/ui/HelpHint";
import ChoroplethHelp from "@/components/help/Choropleth";
import { FaEarthAmericas } from "react-icons/fa6";
import { Eye, EyeOff } from "lucide-react";

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
          <HelpHint help={ChoroplethHelp} />
        </span>
        <button
          type="button"
          aria-label={choropleth.enabled ? "Hide choropleth" : "Show choropleth"}
          title={choropleth.enabled ? "Hide choropleth" : "Show choropleth"}
          onClick={() => setChoropleth({ enabled: !choropleth.enabled })}
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {choropleth.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
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
