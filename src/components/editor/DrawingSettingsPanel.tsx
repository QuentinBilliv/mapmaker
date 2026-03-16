"use client";

import { useDrawingState, useEditorActions } from "@/lib/editor-context";
import { LINE_STYLES, LINE_DECORATIONS, FILL_PATTERNS, type LineStyle, type LineDecoration, type FillPattern } from "@/lib/types";
import Field from "@/components/ui/Field";
import PanelHeader from "@/components/ui/PanelHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import SliderField from "@/components/ui/SliderField";
import ColorInput from "@/components/ui/ColorInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODE_LABELS: Record<string, string> = {
  polygon: "Drawing Polygon",
  rectangle: "Drawing Rectangle",
  circle: "Drawing Circle",
  polyline: "Drawing Polyline",
  arrow: "Drawing Arrow",
  "double-arrow": "Drawing Double Arrow",
};

const DRAWING_MODES = ["polygon", "rectangle", "circle", "polyline", "arrow", "double-arrow"];

export default function DrawingSettingsPanel() {
  const {
    drawMode,
    activeLabel,
    activeSourceText,
    activeSourceUrl,
    activeColor,
    activeOpacity,
    activeSmoothing,
    activeStrokeWidth,
    activeLineStyle,
    activeLineDecoration,
    activeDecorationSpacing,
    activeFillPattern,
  } = useDrawingState();
  const {
    setDrawMode,
    setActiveLabel,
    setActiveSourceText,
    setActiveSourceUrl,
    setActiveColor,
    setActiveOpacity,
    setActiveSmoothing,
    setActiveStrokeWidth,
    setActiveLineStyle,
    setActiveLineDecoration,
    setActiveDecorationSpacing,
    setActiveFillPattern,
    finishDrawing,
    cancelDrawing,
    selectFeature,
  } = useEditorActions();

  if (!DRAWING_MODES.includes(drawMode)) return null;

  const isPolygon = drawMode === "polygon" || drawMode === "rectangle" || drawMode === "circle";

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
            <ColorInput
              value={activeColor}
              onChange={(e) => setActiveColor(e.target.value)}
            />
          </Field>
          <Field label={`Opacity (${Math.round(activeOpacity * 100)}%)`} className="flex-1">
            <SliderField
              value={activeOpacity}
              onChange={setActiveOpacity}
              min={0}
              max={100}
              step={5}
              scale={100}
              className="mt-2"
            />
          </Field>
        </div>
        <div className="flex gap-3">
          <Field label={`Stroke (${activeStrokeWidth}px)`} className="flex-1">
            <SliderField
              value={activeStrokeWidth}
              onChange={setActiveStrokeWidth}
              min={1}
              max={10}
              step={1}
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
        <Field label="Line decoration">
          <Select value={activeLineDecoration} onValueChange={(v) => setActiveLineDecoration(v as LineDecoration)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LINE_DECORATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {activeLineDecoration !== "none" && (
          <Field label={`Decoration spacing (${activeDecorationSpacing}px)`}>
            <SliderField
              value={activeDecorationSpacing}
              onChange={setActiveDecorationSpacing}
              min={5}
              max={200}
              step={5}
              className="mt-2"
            />
          </Field>
        )}
        <Field label={`Smoothing (${Math.round(activeSmoothing * 100)}%)`}>
          <SliderField
            value={activeSmoothing}
            onChange={setActiveSmoothing}
            min={0}
            max={100}
            step={5}
            scale={100}
            className="mt-2"
          />
        </Field>
        {isPolygon && (
          <Field label="Fill pattern">
            <div className="flex gap-1 flex-wrap">
              {FILL_PATTERNS.map((p) => (
                <Button
                  key={p.value}
                  variant={activeFillPattern === p.value ? "default" : "outline"}
                  size="xs"
                  onClick={() => setActiveFillPattern(p.value as FillPattern)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </Field>
        )}
        {isPolygon && (
          <Field label={`Fill opacity (${Math.round(activeOpacity * 100)}%)`}>
            <SliderField
              value={activeOpacity}
              onChange={setActiveOpacity}
              min={0}
              max={100}
              step={5}
              scale={100}
              className="mt-2"
            />
          </Field>
        )}
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
