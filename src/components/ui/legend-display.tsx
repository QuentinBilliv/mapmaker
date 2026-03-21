"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeatureSwatch } from "@/components/ui/feature-swatch";
import type { FeatureData, LegendEntry } from "@/lib/types";
import { legendEntryToSyntheticFeature } from "@/lib/resolve-style";

interface LegendDisplayProps {
  features: FeatureData[];
  legendEntries?: LegendEntry[];
  onAdd?: () => void;
  alwaysShow?: boolean;
}

export function LegendDisplay({ features, legendEntries = [], onAdd, alwaysShow }: LegendDisplayProps) {
  const [open, setOpen] = useState(false);

  const standaloneFeatures = features
    .filter((f) => f.showInLegend && !f.legendEntryId)
    .sort((a, b) => a.order - b.order);

  const sortedEntries = [...legendEntries].sort((a, b) => a.order - b.order);
  const hasItems = standaloneFeatures.length > 0 || sortedEntries.length > 0;

  if (!hasItems && !alwaysShow) return null;

  return (
    <div className="absolute bottom-8 left-3 z-10">
      {open ? (
        <div className="bg-popover/90 backdrop-blur-sm rounded-lg shadow-lg p-3 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Legend</span>
            <div className="flex items-center gap-1">
              {onAdd && (
                <button
                  onClick={onAdd}
                  className="text-muted-foreground hover:text-foreground text-sm leading-none px-1"
                  title="Add legend entry"
                >
                  +
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs leading-none p-0.5"
              >
                x
              </button>
            </div>
          </div>
          {hasItems ? (
            <div className="grid grid-cols-3 gap-x-3 gap-y-1">
              {sortedEntries.map((entry) => {
                const synthetic = legendEntryToSyntheticFeature(entry);
                return (
                  <div key={entry.id} className="flex flex-col items-center gap-0.5">
                    <FeatureSwatch feature={synthetic} />
                    {entry.label && <span className="text-[10px] text-foreground text-center leading-tight break-words max-w-20">{entry.label}</span>}
                  </div>
                );
              })}
              {standaloneFeatures.map((f) => (
                <div key={f.id} className="flex flex-col items-center gap-0.5">
                  <FeatureSwatch feature={f} />
                  {f.label && <span className="text-[10px] text-foreground text-center leading-tight break-words max-w-20">{f.label}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              No legend entries yet. Click + to add one.
            </p>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="text-xs bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(true)}
        >
          Legend
        </Button>
      )}
    </div>
  );
}
