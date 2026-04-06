"use client";

import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { LegendDisplay } from "@/components/ui/legend-display";

export default function Legend() {
  const { features, legendEntries, choropleth } = useEditorData();
  const { addLegendEntry } = useEditorActions();
  const choroplethCategories = choropleth.enabled && choropleth.mode === "discrete" ? choropleth.categories : [];
  const gradientValues = choropleth.values ?? {};
  const gradientNums = Object.values(gradientValues);
  const choroplethGradient = choropleth.enabled && choropleth.mode === "gradient" && gradientNums.length > 0
    ? { colors: choropleth.gradientColors ?? ["#22c55e", "#3b82f6"] as [string, string], label: choropleth.gradientLabel ?? "", min: Math.min(...gradientNums), max: Math.max(...gradientNums) }
    : undefined;

  return (
    <LegendDisplay
      features={features}
      legendEntries={legendEntries}
      choroplethCategories={choroplethCategories}
      choroplethGradient={choroplethGradient}
      onAdd={addLegendEntry}
      alwaysShow
    />
  );
}
