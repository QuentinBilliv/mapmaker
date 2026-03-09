"use client";

import { useEditor } from "@/lib/editor-context";
import { DrawMode } from "@/lib/draw-engine";

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
  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 bg-white rounded-lg shadow-lg p-2">
      <ToolButtons />
      <div className="border-t my-1" />
      <ColorPalette />
      <div className="border-t my-1" />
      <OpacitySlider />
    </div>
  );
}

function ToolButtons() {
  const { drawMode, setDrawMode } = useEditor();

  return (
    <>
      {TOOLS.map((tool) => (
        <button
          key={tool.mode}
          onClick={() => setDrawMode(tool.mode)}
          className={`w-10 h-10 flex items-center justify-center rounded text-lg transition-colors ${
            drawMode === tool.mode
              ? "bg-blue-600 text-white"
              : "hover:bg-gray-100 text-gray-700"
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
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
            activeColor === color ? "border-blue-600" : "border-transparent"
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}

function OpacitySlider() {
  const { activeOpacity, setActiveOpacity } = useEditor();

  return (
    <div className="px-1">
      <input
        type="range"
        min={0.1}
        max={1}
        step={0.1}
        value={activeOpacity}
        onChange={(e) => setActiveOpacity(parseFloat(e.target.value))}
        className="w-full h-1 accent-blue-600"
        title={`Opacity: ${Math.round(activeOpacity * 100)}%`}
      />
    </div>
  );
}
