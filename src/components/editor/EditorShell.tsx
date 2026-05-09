"use client";

import { useCallback, useEffect, useState } from "react";
import MapCanvas from "./MapCanvas";
import MapCanvasErrorBoundary from "./MapCanvasErrorBoundary";
import DrawingToolbar from "./DrawingToolbar";
import DrawingActionButtons from "./DrawingActionButtons";
import FeatureForm from "./FeatureForm";

import MapMetadata from "./MapMetadata";
import BaseMapSelector from "./BaseMapSelector";
import Legend from "./Legend";
import FeaturePanel, { MapSizeBar } from "./FeaturePanel";
import LegendPanel from "./LegendPanel";
import ChoroplethPanel from "./ChoroplethPanel";
import ExportImportButtons from "./ExportImportButtons";

import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { Button } from "@/components/ui/button";
import TutorialWelcome from "./TutorialWelcome";
import MobileEditorNotice from "./MobileEditorNotice";
import { FaLayerGroup, FaXmark } from "react-icons/fa6";

export default function EditorShell() {
  const { choroplethMode } = useEditorData();
  const { setChoroplethMode, selectFeature } = useEditorActions();
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bypassMobile, setBypassMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (window.localStorage.getItem("bypassMobileEditor") === "1") {
      setBypassMobile(true);
    }
  }, []);
  useEffect(() => {
    if (!isMobile) return;
    const handler = () => setShowSidebar(true);
    window.addEventListener("idomaps:choropleth-edit-region", handler);
    window.addEventListener("idomaps:country-clicked", handler);
    return () => {
      window.removeEventListener("idomaps:choropleth-edit-region", handler);
      window.removeEventListener("idomaps:country-clicked", handler);
    };
  }, [isMobile]);
  const handleBypassMobile = useCallback(() => {
    window.localStorage.setItem("bypassMobileEditor", "1");
    setBypassMobile(true);
  }, []);

  const handleOpenChoropleth = useCallback(() => {
    setChoroplethMode(true);
    selectFeature(null);
  }, [setChoroplethMode, selectFeature]);

  const handleCloseChoropleth = useCallback(() => {
    setChoroplethMode(false);
  }, [setChoroplethMode]);

  if (isMobile && !bypassMobile) return <MobileEditorNotice onBypass={handleBypassMobile} />;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 relative overflow-hidden">
        <MapCanvasErrorBoundary>
          <MapCanvas />
        </MapCanvasErrorBoundary>
        {!choroplethMode && <DrawingToolbar />}
        {!choroplethMode && <DrawingActionButtons />}
        <MapMetadata />
        {!choroplethMode && <FeatureForm />}
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
          <div className="hidden md:flex gap-1.5">
            <ExportImportButtons />
          </div>
        </div>
      </div>
      {showSidebar && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
      <aside
        className={`fixed right-0 top-0 bottom-0 z-40 w-72 bg-popover flex flex-col shrink-0 border-l transition-transform duration-200 md:static md:!translate-x-0 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto ${
          showSidebar ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 md:hidden">
          <div className="flex gap-1.5">
            <ExportImportButtons />
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowSidebar(false)}
          >
            <FaXmark className="w-4 h-4" />
          </Button>
        </div>
        <MapSizeBar />
        <div className={choroplethMode ? "opacity-40 pointer-events-none" : ""}>
          <FeaturePanel />
          <LegendPanel />
        </div>
        <ChoroplethPanel
          onOpenDialog={handleOpenChoropleth}
          choroplethMode={choroplethMode}
          onCloseChoropleth={handleCloseChoropleth}
        />
      </aside>
    </div>
  );
}
