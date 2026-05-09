"use client";

import { useDrawingState, useEditorData, useEditorActions } from "@/lib/editor-context";
import { Button } from "@/components/ui/button";
import { FaCheck, FaXmark } from "react-icons/fa6";

const FINISHABLE_MODES = new Set(["polygon", "polyline", "arrow", "double-arrow"]);

export default function DrawingActionButtons() {
  const { drawMode } = useDrawingState();
  const { drawingPointCount } = useEditorData();
  const { finishDrawing, cancelDrawing } = useEditorActions();

  if (!FINISHABLE_MODES.has(drawMode)) return null;
  if (drawingPointCount === 0) return null;
  const canFinish = drawMode === "polygon" ? drawingPointCount >= 3 : drawingPointCount >= 2;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-popover rounded-lg shadow-lg p-1">
      <Button
        size="sm"
        variant="default"
        onClick={finishDrawing}
        disabled={!canFinish}
        className="text-xs gap-1"
        title={canFinish ? "Finish drawing (Enter)" : `Add ${drawMode === "polygon" ? 3 : 2} points to finish`}
      >
        <FaCheck className="w-3 h-3" />
        Done
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={cancelDrawing}
        className="text-xs gap-1"
        title="Cancel drawing (Esc)"
      >
        <FaXmark className="w-3.5 h-3.5" />
        Cancel
      </Button>
    </div>
  );
}
