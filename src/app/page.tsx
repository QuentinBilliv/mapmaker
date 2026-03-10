"use client";

import { EditorProvider } from "@/lib/editor-context";
import MapCanvas from "@/components/editor/MapCanvas";
import DrawingToolbar from "@/components/editor/DrawingToolbar";
import LayerPanel from "@/components/editor/LayerPanel";
import FeatureForm from "@/components/editor/FeatureForm";
import DrawingSettingsPanel from "@/components/editor/DrawingSettingsPanel";
import MapMetadata from "@/components/editor/MapMetadata";
import BaseMapSelector from "@/components/editor/BaseMapSelector";

export default function Home() {
  return (
    <EditorProvider>
      <div className="h-screen w-screen relative overflow-hidden">
        <MapCanvas />
        <DrawingToolbar />
        <LayerPanel />
        <MapMetadata />
        <DrawingSettingsPanel />
        <FeatureForm />
        <BaseMapSelector />
      </div>
    </EditorProvider>
  );
}
