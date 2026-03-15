"use client";

import { useState, useRef, useEffect } from "react";
import { useEditorData } from "@/lib/editor-context";
import { Button } from "@/components/ui/button";
import type { FeatureData } from "@/lib/types";
import { drawShape } from "@/lib/legend-canvas";

const SWATCH_W = 56;
const SWATCH_H = 32;
const PR = 2;

function CanvasSwatch({ feature }: { feature: FeatureData }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawShape(ctx, feature, canvas.width, canvas.height).then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [feature]);

  return (
    <canvas
      ref={ref}
      width={SWATCH_W * PR}
      height={SWATCH_H * PR}
      className="shrink-0"
      style={{ width: SWATCH_W, height: SWATCH_H }}
    />
  );
}

export default function Legend() {
  const { features, layers } = useEditorData();
  const [open, setOpen] = useState(false);

  const visibleLayerIds = new Set(layers.filter((l) => l.visible).map((l) => l.id));
  const legendFeatures = features
    .filter((f) => f.showInLegend && visibleLayerIds.has(f.layerId))
    .sort((a, b) => a.order - b.order);

  if (legendFeatures.length === 0) return null;

  const groupedByLayer = layers
    .filter((l) => l.visible)
    .map((layer) => ({
      layer,
      items: legendFeatures.filter((f) => f.layerId === layer.id),
    }))
    .filter((g) => g.items.length > 0);

  const multiLayer = groupedByLayer.length > 1;

  return (
    <div className="absolute bottom-8 left-3 z-10">
      {open ? (
        <div className="bg-popover/90 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-64 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Legend</span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs leading-none p-0.5"
            >
              ✕
            </button>
          </div>
          {groupedByLayer.map(({ layer, items }) => (
            <div key={layer.id}>
              {multiLayer && (
                <div className="text-[10px] font-medium text-muted-foreground mt-1.5 mb-0.5 uppercase tracking-wide">
                  {layer.name}
                </div>
              )}
              {items.map((f) => (
                <div key={f.id} className="flex items-center gap-2 py-1">
                  <CanvasSwatch feature={f} />
                  <span className="text-xs text-foreground truncate">{f.label}</span>
                </div>
              ))}
            </div>
          ))}
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
