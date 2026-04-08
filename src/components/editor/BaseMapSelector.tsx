"use client";

import { useState, type ReactNode } from "react";
import { useDrawingState, useEditorActions } from "@/lib/editor-context";
import { BASE_MAPS } from "@/lib/map-style";
import { Button } from "@/components/ui/button";
import { FaMap, FaGlobe, FaBorderAll, FaRoad } from "react-icons/fa6";

type Projection = "mercator" | "globe";

function StrikethroughIcon({ strikethrough, children }: { strikethrough: boolean; children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center justify-center">
      {children}
      {strikethrough && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="block w-[140%] h-[1.5px] bg-current rotate-[-45deg] rounded-full opacity-80" />
        </span>
      )}
    </span>
  );
}

export default function BaseMapSelector() {
  const { activeBaseMap, styleOptions } = useDrawingState();
  const { setActiveBaseMap, setStyleOptions } = useEditorActions();
  const [projection, setProjection] = useState<Projection>("mercator");

  const isVector = !!activeBaseMap.vector;

  function switchProjection(p: Projection) {
    if (p === projection) return;
    setProjection(p);
    window.dispatchEvent(
      new CustomEvent("mapmaker:set-projection", {
        detail: { projection: p },
      })
    );
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
        onChange={(e) => {
          const bm = BASE_MAPS.find((b) => b.id === e.target.value);
          if (bm) setActiveBaseMap(bm);
        }}
        className="lg:hidden h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {BASE_MAPS.map((bm) => (
          <option key={bm.id} value={bm.id}>{bm.label}</option>
        ))}
      </select>
      {isVector && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStyleOptions({ ...styleOptions, noLabels: !styleOptions.noLabels })}
            title={styleOptions.noLabels ? "Show labels" : "Hide labels"}
          >
            <StrikethroughIcon strikethrough={!!styleOptions.noLabels}>
              <span className="text-xs">Aa</span>
            </StrikethroughIcon>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStyleOptions({ ...styleOptions, noBorders: !styleOptions.noBorders })}
            title={styleOptions.noBorders ? "Show borders" : "Hide borders"}
          >
            <StrikethroughIcon strikethrough={!!styleOptions.noBorders}>
              <FaBorderAll className="w-3.5 h-3.5" />
            </StrikethroughIcon>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStyleOptions({ ...styleOptions, noRoads: !styleOptions.noRoads })}
            title={styleOptions.noRoads ? "Show roads" : "Hide roads"}
          >
            <StrikethroughIcon strikethrough={!!styleOptions.noRoads}>
              <FaRoad className="w-3.5 h-3.5" />
            </StrikethroughIcon>
          </Button>
        </>
      )}
    </div>
  );
}
