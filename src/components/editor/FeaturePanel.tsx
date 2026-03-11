"use client";

import { useEditor } from "@/lib/editor-context";
import type { FeatureData } from "@/lib/types";
import { ShapePreview } from "@/components/ui/marker-icons";

function FeatureIcon({ feature }: { feature: FeatureData }) {
  if (feature.type === "point" && feature.shape) {
    return (
      <span className="shrink-0" style={{ color: feature.color }}>
        <ShapePreview shape={feature.shape} />
      </span>
    );
  }
  let icon = "⬡";
  if (feature.type === "polyline") {
    if (feature.arrowStyle === "both") icon = "↔";
    else if (feature.arrowStyle === "forward") icon = "→";
    else icon = "╱";
  }
  return (
    <span className="text-xs shrink-0" style={{ color: feature.color }}>
      {icon}
    </span>
  );
}

export default function FeaturePanel() {
  const { features, layers, selectedFeature, selectFeature } = useEditor();

  const layerMap = new Map(layers.map((l) => [l.id, l]));

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Features</h3>
        <span className="text-xs text-muted-foreground">{features.length}</span>
      </div>
      {features.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground text-center">
          No features yet. Draw something on the map.
        </p>
      ) : (
        <div className="overflow-y-auto">
          {features.map((feature) => (
            <FeatureRow
              key={feature.id}
              feature={feature}
              layerName={layerMap.get(feature.layerId)?.name}
              isSelected={selectedFeature?.id === feature.id}
              onSelect={() => selectFeature(feature.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureRow({
  feature,
  layerName,
  isSelected,
  onSelect,
}: {
  feature: FeatureData;
  layerName?: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm border-b last:border-b-0 ${
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted text-foreground"
      }`}
    >
      <FeatureIcon feature={feature} />
      <span className="flex-1 truncate">
        {feature.label || <span className="text-muted-foreground italic">Untitled</span>}
      </span>
      {layerName && (
        <span className="text-[10px] text-muted-foreground truncate max-w-16">
          {layerName}
        </span>
      )}
    </div>
  );
}
