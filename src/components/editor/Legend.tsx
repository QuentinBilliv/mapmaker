"use client";

import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { LegendDisplay } from "@/components/ui/legend-display";

export default function Legend() {
  const { features, legendEntries, choropleth } = useEditorData();
  const { addLegendEntry } = useEditorActions();
  const choroplethCategories = choropleth.enabled ? choropleth.categories : [];

  return (
    <LegendDisplay
      features={features}
      legendEntries={legendEntries}
      choroplethCategories={choroplethCategories}
      onAdd={addLegendEntry}
      alwaysShow
    />
  );
}
