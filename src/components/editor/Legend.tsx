"use client";

import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { LegendDisplay } from "@/components/ui/legend-display";
import { choroplethLegendProps } from "@/lib/choropleth-legend";

export default function Legend() {
  const { features, legendEntries, choropleth } = useEditorData();
  const { addLegendEntry } = useEditorActions();

  return (
    <LegendDisplay
      features={features}
      legendEntries={legendEntries}
      {...choroplethLegendProps(choropleth)}
      onAdd={addLegendEntry}
      alwaysShow
    />
  );
}
