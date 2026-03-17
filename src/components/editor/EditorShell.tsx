"use client";

import { useState } from "react";
import MapCanvas from "./MapCanvas";
import MapCanvasErrorBoundary from "./MapCanvasErrorBoundary";
import DrawingToolbar from "./DrawingToolbar";
import FeatureForm from "./FeatureForm";
import DrawingSettingsPanel from "./DrawingSettingsPanel";
import MapMetadata from "./MapMetadata";
import BaseMapSelector from "./BaseMapSelector";
import Legend from "./Legend";
import FeaturePanel from "./FeaturePanel";
import CodePanel from "./CodePanel";

import { Button } from "@/components/ui/button";

export default function EditorShell() {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="flex-1 flex overflow-hidden">
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
        <FeaturePanel />
      </aside>
      {showCode && (
        <aside className="w-96 h-full border-l bg-background flex flex-col overflow-hidden shrink-0">
          <CodePanel onClose={() => setShowCode(false)} />
        </aside>
      )}
    </div>
  );
}
