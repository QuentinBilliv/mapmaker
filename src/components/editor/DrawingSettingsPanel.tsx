"use client";

import { useEditor } from "@/lib/editor-context";
import { LINE_STYLES, type LineStyle } from "@/lib/types";
import Field from "@/components/ui/Field";
import PanelHeader from "@/components/ui/PanelHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODE_LABELS: Record<string, string> = {
  polygon: "Drawing Polygon",
  polyline: "Drawing Polyline",
  arrow: "Drawing Arrow",
  "double-arrow": "Drawing Double Arrow",
};

const DRAWING_MODES = ["polygon", "polyline", "arrow", "double-arrow"];

export default function DrawingSettingsPanel() {
  const {
    drawMode,
    setDrawMode,
    activeLabel,
    setActiveLabel,
    activeSourceText,
    setActiveSourceText,
    activeSourceUrl,
    setActiveSourceUrl,
    activeColor,
    setActiveColor,
    activeOpacity,
    setActiveOpacity,
    activeSmoothing,
    setActiveSmoothing,
    activeStrokeWidth,
    setActiveStrokeWidth,
    activeLineStyle,
    setActiveLineStyle,
    activeLayerId,
    setActiveLayerId,
    layers,
    finishDrawing,
    cancelDrawing,
    selectFeature,
  } = useEditor();

  if (!DRAWING_MODES.includes(drawMode)) return null;

  const isPolygon = drawMode === "polygon";

  return (
    <div className="absolute left-16 top-3 z-10 w-72 bg-popover rounded-lg shadow-lg overflow-hidden">
      <PanelHeader
        title={MODE_LABELS[drawMode] ?? "Drawing"}
        onClose={() => setDrawMode("select")}
      />
      <div className="p-3 space-y-3">
        <Field label="Label">
          <Input
            type="text"
            value={activeLabel}
            onChange={(e) => setActiveLabel(e.target.value)}
            placeholder="e.g. Roman Empire"
          />
        </Field>
        <div className="flex gap-3">
          <Field label="Color" className="flex-1">
            <input
              type="color"
              value={activeColor}
              onChange={(e) => setActiveColor(e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Field>
          <Field label={`Opacity (${Math.round(activeOpacity * 100)}%)`} className="flex-1">
            <Slider
              min={0}
              max={100}
              step={5}
              value={[Math.round(activeOpacity * 100)]}
              onValueChange={(v: number[]) => setActiveOpacity(v[0] / 100)}
              className="mt-2"
            />
          </Field>
        </div>
        <div className="flex gap-3">
          <Field label={`Stroke (${activeStrokeWidth}px)`} className="flex-1">
            <Slider
              min={1}
              max={10}
              step={1}
              value={[activeStrokeWidth]}
              onValueChange={(v: number[]) => setActiveStrokeWidth(v[0])}
              className="mt-2"
            />
          </Field>
          <Field label="Line style" className="flex-1">
            <Select value={activeLineStyle} onValueChange={(v) => setActiveLineStyle(v as LineStyle)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINE_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label={`Smoothing (${Math.round(activeSmoothing * 100)}%)`}>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[Math.round(activeSmoothing * 100)]}
            onValueChange={(v: number[]) => setActiveSmoothing(v[0] / 100)}
            className="mt-2"
          />
        </Field>
        {isPolygon && (
          <Field label={`Fill opacity (${Math.round(activeOpacity * 100)}%)`}>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[Math.round(activeOpacity * 100)]}
              onValueChange={(v: number[]) => setActiveOpacity(v[0] / 100)}
              className="mt-2"
            />
          </Field>
        )}
        <Field label="Layer">
          <Select value={activeLayerId} onValueChange={setActiveLayerId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layers.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Source / Citation">
          <Textarea
            value={activeSourceText}
            onChange={(e) => setActiveSourceText(e.target.value)}
            rows={2}
            placeholder="e.g. Pliny the Elder, Natural History, Book III"
          />
        </Field>
        <Field label="Source URL">
          <Input
            type="url"
            value={activeSourceUrl}
            onChange={(e) => setActiveSourceUrl(e.target.value)}
            placeholder="https://..."
          />
        </Field>
        <div className="flex gap-2 pt-1">
          <Button onClick={() => { finishDrawing(); selectFeature(null); }} className="flex-1">
            OK
          </Button>
          <Button variant="outline" onClick={() => { cancelDrawing(); setDrawMode("select"); }}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
