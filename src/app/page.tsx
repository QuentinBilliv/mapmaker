"use client";

import { EditorProvider } from "@/lib/editor-context";
import MapCanvas from "@/components/editor/MapCanvas";
import DrawingToolbar from "@/components/editor/DrawingToolbar";
import LayerPanel from "@/components/editor/LayerPanel";
import FeatureForm from "@/components/editor/FeatureForm";
import DrawingSettingsPanel from "@/components/editor/DrawingSettingsPanel";
import MapMetadata from "@/components/editor/MapMetadata";
import BaseMapSelector from "@/components/editor/BaseMapSelector";
import FeaturePanel from "@/components/editor/FeaturePanel";

export default function Home() {
  return (
    <EditorProvider>
      <div className="h-screen w-screen flex overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <MapCanvas />
          <DrawingToolbar />
          <MapMetadata />
          <DrawingSettingsPanel />
          <FeatureForm />
          <BaseMapSelector />
        </div>
        <aside className="w-72 h-full border-l bg-popover flex flex-col overflow-hidden shrink-0">
          <LayerPanel />
          <FeaturePanel />
        </aside>
      </div>
    </EditorProvider>
  );
}
