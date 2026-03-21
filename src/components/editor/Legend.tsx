"use client";

import { useEditorData } from "@/lib/editor-context";
import { LegendDisplay } from "@/components/ui/legend-display";

export default function Legend() {
  const { features, legendEntries } = useEditorData();

  const handleAdd = () => {
    window.dispatchEvent(new CustomEvent("mapmaker:open-legend-create"));
  };

  return (
    <LegendDisplay
      features={features}
      legendEntries={legendEntries}
      onAdd={handleAdd}
      alwaysShow
    />
  );
}
