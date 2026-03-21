"use client";

import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { LegendDisplay } from "@/components/ui/legend-display";

export default function Legend() {
  const { features, legendEntries } = useEditorData();
  const { addLegendEntry } = useEditorActions();

  return (
    <LegendDisplay
      features={features}
      legendEntries={legendEntries}
      onAdd={addLegendEntry}
      alwaysShow
    />
  );
}
