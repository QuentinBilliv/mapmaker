"use client";

import { useEditorData } from "@/lib/editor-context";
import { LegendDisplay } from "@/components/ui/legend-display";

export default function Legend() {
  const { features } = useEditorData();
  return <LegendDisplay features={features} />;
}
