"use client";

import { useState } from "react";
import { useEditor } from "@/lib/editor-context";
import { DrawMode } from "@/lib/draw-engine";
import { POINT_SHAPES } from "@/lib/types";
import { ShapePreview } from "@/components/ui/marker-icons";
import IconPickerDialog from "@/components/editor/IconPickerDialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

const TOOLS: { mode: DrawMode; label: string; icon: string }[] = [
  { mode: "select", label: "Select", icon: "↖" },
  { mode: "polygon", label: "Polygon", icon: "⬠" },
  { mode: "polyline", label: "Polyline", icon: "╲" },
  { mode: "point", label: "Point", icon: "●" },
];

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
  "#1a1a1a", "#ffffff",
];

export default function DrawingToolbar() {
  const { drawMode } = useEditor();

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 bg-popover rounded-lg shadow-lg p-2">
      <ToolButtons />
      <Separator />
      <ColorPalette />
      {drawMode === "point" && (
        <>
          <Separator />
          <MarkerPicker />
        </>
      )}
      <Separator />
      <OpacitySlider />
    </div>
  );
}

function ToolButtons() {
  const { drawMode, setDrawMode } = useEditor();

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

function ColorPalette() {
  const { activeColor, setActiveColor } = useEditor();

  return (
    <div className="grid grid-cols-2 gap-1 px-0.5">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => setActiveColor(color)}
          className={`w-4 h-4 rounded-full border-2 ${
            activeColor === color ? "border-ring" : "border-transparent"
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}

function MarkerPicker() {
  const { activeShape, setActiveShape, activeIcon, setActiveIcon } = useEditor();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-3 gap-1 px-0.5">
        {POINT_SHAPES.map((s) => (
          <Button
            key={s.value}
            variant={!activeIcon && activeShape === s.value ? "default" : "ghost"}
            size="icon-xs"
            onClick={() => { setActiveShape(s.value); setActiveIcon(null); }}
            title={s.label}
          >
            <ShapePreview shape={s.value} />
          </Button>
        ))}
        <Button
          variant={activeIcon ? "default" : "outline"}
          size="icon-xs"
          onClick={() => setPickerOpen(true)}
          title="Choose icon"
        >
          +
        </Button>
      </div>
      <IconPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={activeIcon ?? undefined}
        onSelect={(id) => setActiveIcon(id)}
      />
    </div>
  );
}

function OpacitySlider() {
  const { activeOpacity, setActiveOpacity } = useEditor();

  return (
    <div className="px-1">
      <Slider
        min={10}
        max={100}
        step={10}
        value={[Math.round(activeOpacity * 100)]}
        onValueChange={(v: number[]) => setActiveOpacity(v[0] / 100)}
        title={`Opacity: ${Math.round(activeOpacity * 100)}%`}
      />
    </div>
  );
}
