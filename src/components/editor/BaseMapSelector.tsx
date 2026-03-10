"use client";

import { useEditor } from "@/lib/editor-context";
import { BASE_MAPS } from "@/lib/map-style";
import { Button } from "@/components/ui/button";

export default function BaseMapSelector() {
  const { activeBaseMap, setActiveBaseMap } = useEditor();

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-popover rounded-lg shadow-lg p-1">
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
  );
}
