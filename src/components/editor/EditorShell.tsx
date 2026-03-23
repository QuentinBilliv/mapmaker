"use client";

import { useState } from "react";
import MapCanvas from "./MapCanvas";
import MapCanvasErrorBoundary from "./MapCanvasErrorBoundary";
import DrawingToolbar from "./DrawingToolbar";
import FeatureForm from "./FeatureForm";

import MapMetadata from "./MapMetadata";
import BaseMapSelector from "./BaseMapSelector";
import Legend from "./Legend";
import FeaturePanel from "./FeaturePanel";
import LegendPanel from "./LegendPanel";
import CodePanel from "./CodePanel";

import { Button } from "@/components/ui/button";
import TutorialWelcome from "./TutorialWelcome";
import { FaLayerGroup } from "react-icons/fa6";

export default function EditorShell() {
  const [showCode, setShowCode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 relative overflow-hidden">
        <MapCanvasErrorBoundary>
          <MapCanvas />
        </MapCanvasErrorBoundary>
        <DrawingToolbar />

        <MapMetadata />
        <FeatureForm />
        <BaseMapSelector />
        <Legend />
        <TutorialWelcome />
        <div className="absolute top-3 right-3 z-10 flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="md:hidden text-xs bg-background/80 backdrop-blur-sm"
            onClick={() => setShowSidebar((v) => !v)}
          >
            <FaLayerGroup className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex text-xs bg-background/80 backdrop-blur-sm"
            onClick={() => setShowCode((v) => !v)}
          >
            {showCode ? "Hide JSON" : "{ } JSON"}
          </Button>
        </div>
      </div>
      {showSidebar && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
      <aside
        className={`fixed right-0 top-0 bottom-0 z-40 w-72 bg-popover flex flex-col overflow-hidden shrink-0 border-l transition-transform duration-200 md:static md:translate-x-0 md:h-full ${
          showSidebar ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <FeaturePanel />
        <LegendPanel />
      </aside>
      {showCode && (
        <aside className="hidden md:flex w-96 h-full border-l bg-background flex-col overflow-hidden shrink-0">
          <CodePanel onClose={() => setShowCode(false)} />
        </aside>
      )}
    </div>
  );
}
