"use client";

import { useState } from "react";
import { useDrawingState, useEditorData, useEditorActions } from "@/lib/editor-context";
import { DrawMode } from "@/lib/draw-engine";
import { FaRotateLeft, FaRotateRight, FaEarthAmericas, FaArrowPointer } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import GeoBankDialog from "@/components/editor/GeoBankDialog";
import GeoSearchButton from "@/components/editor/GeoSearchBar";
import KeyboardShortcutsButton from "@/components/editor/KeyboardShortcutsDialog";

const TOOLS: { mode: DrawMode; label: string; icon: React.ReactNode }[] = [
  { mode: "select", label: "Select", icon: <FaArrowPointer className="w-4 h-4" /> },
  { mode: "polygon", label: "Polygon", icon: "⬠" },
  { mode: "rectangle", label: "Rectangle", icon: "▭" },
  { mode: "circle", label: "Circle", icon: "◯" },
  { mode: "polyline", label: "Polyline", icon: "╲" },
  { mode: "arrow", label: "Arrow", icon: "→" },
  { mode: "double-arrow", label: "Double Arrow", icon: "↔" },
  { mode: "point", label: "Point", icon: "●" },
  { mode: "text", label: "Text", icon: "T" },
];

export default function DrawingToolbar() {
  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 bg-popover rounded-lg shadow-lg p-1.5 max-h-[calc(100vh-6rem)] overflow-y-auto md:p-2">
      <ToolButtons />
      <Separator />
      <UndoRedoButtons />
      <Separator />
      <GeoBankButton />
      <GeoSearchButton />
      <KeyboardShortcutsButton />
    </div>
  );
}

function ToolButtons() {
  const { drawMode } = useDrawingState();
  const { setDrawMode } = useEditorActions();

  return (
    <>
      {TOOLS.map((tool) => (
        <Button
          key={tool.mode}
          variant={drawMode === tool.mode ? "default" : "ghost"}
          size="icon"
          onClick={() => setDrawMode(tool.mode)}
          title={tool.label}
          className="text-lg"
        >
          {tool.icon}
        </Button>
      ))}
    </>
  );
}

function UndoRedoButtons() {
  const { canUndo, canRedo } = useEditorData();
  const { undo, redo } = useEditorActions();

  return (
    <div className="flex flex-col gap-1">
      <Button variant="ghost" size="icon" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">
        <FaRotateLeft />
      </Button>
      <Button variant="ghost" size="icon" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Shift+Z)">
        <FaRotateRight />
      </Button>
    </div>
  );
}

function GeoBankButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="GeoJSON Bank">
        <FaEarthAmericas />
      </Button>
      <GeoBankDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

