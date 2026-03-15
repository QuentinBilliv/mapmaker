"use client";

import { useState } from "react";
import { EditorProvider } from "@/lib/editor-context";
import MapCanvas from "@/components/editor/MapCanvas";
import MapCanvasErrorBoundary from "@/components/editor/MapCanvasErrorBoundary";
import DrawingToolbar from "@/components/editor/DrawingToolbar";
import LayerPanel from "@/components/editor/LayerPanel";
import FeatureForm from "@/components/editor/FeatureForm";
import DrawingSettingsPanel from "@/components/editor/DrawingSettingsPanel";
import MapMetadata from "@/components/editor/MapMetadata";
import BaseMapSelector from "@/components/editor/BaseMapSelector";
import Legend from "@/components/editor/Legend";
import FeaturePanel from "@/components/editor/FeaturePanel";
import CodePanel from "@/components/editor/CodePanel";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showCode, setShowCode] = useState(false);

  return (
    <EditorProvider>
      <div className="h-screen w-screen flex overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <MapCanvasErrorBoundary>
            <MapCanvas />
          </MapCanvasErrorBoundary>
          <DrawingToolbar />
          <MapMetadata />
          <DrawingSettingsPanel />
          <FeatureForm />
          <BaseMapSelector />
          <Legend />
          <Button
            variant="outline"
            size="sm"
            className="absolute top-3 right-3 z-10 text-xs bg-background/80 backdrop-blur-sm"
            onClick={() => setShowCode((v) => !v)}
          >
            {showCode ? "Hide JSON" : "{ } JSON"}
          </Button>
        </div>
        <aside className="w-72 h-full border-l bg-popover flex flex-col overflow-hidden shrink-0">
          <LayerPanel />
          <FeaturePanel />
        </aside>
        {showCode && (
          <aside className="w-96 h-full border-l bg-background flex flex-col overflow-hidden shrink-0">
            <CodePanel onClose={() => setShowCode(false)} />
          </aside>
        )}
      </div>
    </EditorProvider>
  );
}
