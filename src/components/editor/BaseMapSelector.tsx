"use client";

import { useState } from "react";
import { useDrawingState, useEditorActions } from "@/lib/editor-context";
import { BASE_MAPS, findBaseMap } from "@/lib/map-style";
import { Button } from "@/components/ui/button";
import { FaMap, FaGlobe } from "react-icons/fa6";

type Projection = "mercator" | "globe";

export default function BaseMapSelector() {
  const { activeBaseMap } = useDrawingState();
  const { setActiveBaseMap } = useEditorActions();
  const [projection, setProjection] = useState<Projection>("mercator");

  function switchProjection(p: Projection) {
    if (p === projection) return;
    setProjection(p);
    window.dispatchEvent(
      new CustomEvent("mapmaker:set-projection", {
        detail: { projection: p },
      })
    );
  }

  function handleBaseMapChange(id: string) {
    setActiveBaseMap(findBaseMap(id));
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-popover rounded-lg shadow-lg p-1">
      <Button
        variant={projection === "mercator" ? "default" : "ghost"}
        size="sm"
        onClick={() => switchProjection("mercator")}
        title="Flat map"
      >
        <FaMap className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant={projection === "globe" ? "default" : "ghost"}
        size="sm"
        onClick={() => switchProjection("globe")}
        title="Globe"
      >
        <FaGlobe className="w-3.5 h-3.5" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <div className="hidden lg:flex items-center gap-1">
        {BASE_MAPS.map((bm) => (
          <Button
            key={bm.id}
            variant={activeBaseMap.id === bm.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveBaseMap(bm)}
          >
            {bm.label}
          </Button>
        ))}
      </div>
      <select
        value={activeBaseMap.id}
        onChange={(e) => handleBaseMapChange(e.target.value)}
        className="lg:hidden h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {BASE_MAPS.map((bm) => (
          <option key={bm.id} value={bm.id}>{bm.label}</option>
        ))}
      </select>
    </div>
  );
}
