"use client";

import { useState, useEffect } from "react";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import type { LegendFeatureType, LegendEntry, NewLegendEntry } from "@/lib/types";
import { POINT_SHAPES, LINE_STYLES, LINE_DECORATIONS, FILL_PATTERNS, ARROW_STYLES } from "@/lib/types";
import type { PointShape, LineStyle, ArrowStyle, LineDecoration, FillPattern } from "@/lib/types";
import { COLORS, DEFAULT_BORDER_WIDTH } from "@/lib/defaults";
import { FeatureSwatch } from "@/components/ui/feature-swatch";
import { legendEntryToSyntheticFeature } from "@/lib/resolve-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ColorInput from "@/components/ui/ColorInput";
import SliderField from "@/components/ui/SliderField";
import Field from "@/components/ui/Field";
import { ShapePreview } from "@/components/ui/marker-icons";
import IconPickerDialog from "@/components/editor/IconPickerDialog";
import { FaTrash, FaPen } from "react-icons/fa6";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LegendPanel() {
  const { legendEntries } = useEditorData();
  const { addLegendEntry, updateLegendEntry, deleteLegendEntry } = useEditorActions();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => { setCreating(true); setEditingId(null); };
    window.addEventListener("mapmaker:open-legend-create", handler);
    return () => window.removeEventListener("mapmaker:open-legend-create", handler);
  }, []);

  const sorted = [...legendEntries].sort((a, b) => a.order - b.order);
  const editingEntry = editingId ? legendEntries.find((e) => e.id === editingId) : null;

  return (
    <div className="border-t flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Legend</h3>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => { setCreating(true); setEditingId(null); }}
          title="Add legend entry"
        >
          +
        </Button>
      </div>
      {creating && (
        <CreateEntryForm
          onSubmit={(entry) => { addLegendEntry(entry); setCreating(false); }}
          onCancel={() => setCreating(false)}
        />
      )}
      {editingEntry && (
        <EditEntryForm
          entry={editingEntry}
          onUpdate={(updates) => updateLegendEntry(editingEntry.id, updates)}
          onClose={() => setEditingId(null)}
        />
      )}
      {sorted.length === 0 && !creating ? (
        <p className="px-3 py-3 text-xs text-muted-foreground text-center">
          No legend entries. Click + to add one.
        </p>
      ) : (
        <div className="overflow-y-auto max-h-48">
          {sorted.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border-b last:border-b-0 hover:bg-muted"
            >
              <FeatureSwatch feature={legendEntryToSyntheticFeature(entry)} width={36} height={22} />
              <span className="flex-1 truncate text-xs">{entry.label || "Untitled"}</span>
              <button
                onClick={() => { setEditingId(entry.id); setCreating(false); }}
                className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                title="Edit"
              >
                <FaPen className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => deleteLegendEntry(entry.id)}
                className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                title="Delete"
              >
                <FaTrash className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateEntryForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (entry: NewLegendEntry) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"type" | "style">("type");
  const [featureType, setFeatureType] = useState<LegendFeatureType>("point");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLORS.primary);
  const [opacity, setOpacity] = useState(1);
  const [size, setSize] = useState(1);
  const [shape, setShape] = useState<PointShape>("circle");
  const [icon, setIcon] = useState<string | undefined>();
  const [borderColor, setBorderColor] = useState(COLORS.white);
  const [borderWidth, setBorderWidth] = useState(DEFAULT_BORDER_WIDTH);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [smoothing, setSmoothing] = useState(0);
  const [lineStyle, setLineStyle] = useState<LineStyle>("solid");
  const [arrowStyle, setArrowStyle] = useState<ArrowStyle>("none");
  const [lineDecoration, setLineDecoration] = useState<LineDecoration>("none");
  const [decorationSpacing, setDecorationSpacing] = useState(50);
  const [fillPattern, setFillPattern] = useState<FillPattern>("none");
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleCreate() {
    const base = { label: label || "New entry", color, opacity };
    if (featureType === "point") {
      onSubmit({ ...base, featureType: "point", size, shape: icon ? undefined : shape, icon, borderColor, borderWidth });
    } else if (featureType === "polyline") {
      onSubmit({ ...base, featureType: "polyline", smoothing, strokeWidth, lineStyle, arrowStyle, lineDecoration, decorationSpacing });
    } else {
      onSubmit({ ...base, featureType: "polygon", smoothing, strokeWidth, lineStyle, lineDecoration, decorationSpacing, fillPattern });
    }
  }

  if (step === "type") {
    return (
      <div className="px-3 py-2 border-b bg-muted/50 space-y-2">
        <p className="text-xs font-medium">Choose type</p>
        <div className="flex gap-1">
          {(["point", "polyline", "polygon"] as const).map((t) => (
            <Button key={t} size="xs" variant={featureType === t ? "default" : "outline"} onClick={() => setFeatureType(t)}>
              {t === "point" ? "Point" : t === "polyline" ? "Line" : "Polygon"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button size="xs" onClick={() => setStep("style")} className="flex-1">Next</Button>
          <Button size="xs" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b bg-muted/50 space-y-2 max-h-80 overflow-y-auto">
      <Input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Entry label" className="h-7 text-xs" />
      <div className="flex gap-2">
        <Field label="Color" className="flex-1">
          <ColorInput value={color} onChange={(e) => setColor((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label={`Opacity ${Math.round(opacity * 100)}%`} className="flex-1">
          <SliderField value={opacity} onChange={setOpacity} min={0} max={100} step={5} scale={100} className="mt-1" />
        </Field>
      </div>
      {featureType === "point" && (
        <>
          <Field label="Marker">
            <div className="flex gap-1 flex-wrap">
              {POINT_SHAPES.map((s) => (
                <Button key={s.value} variant={!icon && shape === s.value ? "default" : "outline"} size="icon-xs" onClick={() => { setShape(s.value); setIcon(undefined); }} title={s.label}>
                  <ShapePreview shape={s.value} />
                </Button>
              ))}
              <Button variant={icon ? "default" : "outline"} size="icon-xs" onClick={() => setPickerOpen(true)} title="Choose icon">+</Button>
            </div>
            <IconPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} selected={icon} onSelect={(i) => { setIcon(i); setShape("circle"); }} />
          </Field>
          <Field label={`Size ${Math.round(size * 100)}%`}>
            <SliderField value={size} onChange={setSize} min={50} max={300} step={25} scale={100} />
          </Field>
          <div className="flex gap-2">
            <Field label="Border color" className="flex-1">
              <ColorInput value={borderColor} onChange={(e) => setBorderColor((e.target as HTMLInputElement).value)} />
            </Field>
            <Field label={`Width ${borderWidth}px`} className="flex-1">
              <SliderField value={borderWidth} onChange={setBorderWidth} min={0} max={12} step={1} className="mt-1" />
            </Field>
          </div>
        </>
      )}
      {(featureType === "polyline" || featureType === "polygon") && (
        <>
          <div className="flex gap-2">
            <Field label={`Stroke ${strokeWidth}px`} className="flex-1">
              <SliderField value={strokeWidth} onChange={setStrokeWidth} min={1} max={10} step={1} />
            </Field>
            <Field label="Line style" className="flex-1">
              <Select value={lineStyle} onValueChange={(v) => setLineStyle(v as LineStyle)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{LINE_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Line decoration">
            <Select value={lineDecoration} onValueChange={(v) => setLineDecoration(v as LineDecoration)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{LINE_DECORATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {lineDecoration !== "none" && (
            <Field label={`Decoration spacing ${decorationSpacing}px`}>
              <SliderField value={decorationSpacing} onChange={setDecorationSpacing} min={5} max={200} step={5} />
            </Field>
          )}
          <Field label={`Smoothing ${Math.round(smoothing * 100)}%`}>
            <SliderField value={smoothing} onChange={setSmoothing} min={0} max={100} step={5} scale={100} />
          </Field>
        </>
      )}
      {featureType === "polyline" && (
        <Field label="Arrows">
          <Select value={arrowStyle} onValueChange={(v) => setArrowStyle(v as ArrowStyle)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{ARROW_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      )}
      {featureType === "polygon" && (
        <Field label="Fill pattern">
          <div className="flex gap-1 flex-wrap">
            {FILL_PATTERNS.map((p) => (
              <Button key={p.value} variant={fillPattern === p.value ? "default" : "outline"} size="xs" onClick={() => setFillPattern(p.value)}>
                {p.label}
              </Button>
            ))}
          </div>
        </Field>
      )}
      <div className="flex gap-1">
        <Button size="xs" onClick={handleCreate} className="flex-1">Create</Button>
        <Button size="xs" variant="outline" onClick={() => setStep("type")}>Back</Button>
        <Button size="xs" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function EditEntryForm({
  entry,
  onUpdate,
  onClose,
}: {
  entry: LegendEntry;
  onUpdate: (updates: Partial<LegendEntry>) => void;
  onClose: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isStroke = entry.featureType === "polyline" || entry.featureType === "polygon";

  return (
    <div className="px-3 py-2 border-b bg-accent/30 space-y-2 max-h-80 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Edit: {entry.label}</span>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">x</button>
      </div>
      <Input value={entry.label} onChange={(e) => onUpdate({ label: e.target.value })} className="h-7 text-xs" />
      <div className="flex gap-2">
        <Field label="Color" className="flex-1">
          <ColorInput value={entry.color} onChange={(e) => onUpdate({ color: (e.target as HTMLInputElement).value })} />
        </Field>
        <Field label={`Opacity ${Math.round(entry.opacity * 100)}%`} className="flex-1">
          <SliderField value={entry.opacity} onChange={(v) => onUpdate({ opacity: v })} min={0} max={100} step={5} scale={100} className="mt-1" />
        </Field>
      </div>
      {entry.featureType === "point" && (
        <>
          <Field label="Marker">
            <div className="flex gap-1 flex-wrap">
              {POINT_SHAPES.map((s) => (
                <Button key={s.value} variant={!entry.icon && entry.shape === s.value ? "default" : "outline"} size="icon-xs" onClick={() => onUpdate({ shape: s.value, icon: undefined })} title={s.label}>
                  <ShapePreview shape={s.value} />
                </Button>
              ))}
              <Button variant={entry.icon ? "default" : "outline"} size="icon-xs" onClick={() => setPickerOpen(true)} title="Choose icon">+</Button>
            </div>
            <IconPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} selected={entry.icon} onSelect={(i) => onUpdate({ icon: i, shape: "circle" })} />
          </Field>
          <Field label={`Size ${Math.round(entry.size * 100)}%`}>
            <SliderField value={entry.size} onChange={(v) => onUpdate({ size: v })} min={50} max={300} step={25} scale={100} />
          </Field>
          <div className="flex gap-2">
            <Field label="Border color" className="flex-1">
              <ColorInput value={entry.borderColor} onChange={(e) => onUpdate({ borderColor: (e.target as HTMLInputElement).value })} />
            </Field>
            <Field label={`Width ${entry.borderWidth}px`} className="flex-1">
              <SliderField value={entry.borderWidth} onChange={(v) => onUpdate({ borderWidth: v })} min={0} max={12} step={1} className="mt-1" />
            </Field>
          </div>
        </>
      )}
      {isStroke && (
        <>
          <div className="flex gap-2">
            <Field label={`Stroke ${entry.strokeWidth}px`} className="flex-1">
              <SliderField value={entry.strokeWidth} onChange={(v) => onUpdate({ strokeWidth: v })} min={1} max={10} step={1} />
            </Field>
            <Field label="Line style" className="flex-1">
              <Select value={entry.lineStyle} onValueChange={(v) => onUpdate({ lineStyle: v as LineStyle })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{LINE_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Line decoration">
            <Select value={entry.lineDecoration} onValueChange={(v) => onUpdate({ lineDecoration: v as LineDecoration })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{LINE_DECORATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {entry.lineDecoration !== "none" && (
            <Field label={`Decoration spacing ${entry.decorationSpacing}px`}>
              <SliderField value={entry.decorationSpacing} onChange={(v) => onUpdate({ decorationSpacing: v })} min={5} max={200} step={5} />
            </Field>
          )}
          <Field label={`Smoothing ${Math.round(entry.smoothing * 100)}%`}>
            <SliderField value={entry.smoothing} onChange={(v) => onUpdate({ smoothing: v })} min={0} max={100} step={5} scale={100} />
          </Field>
        </>
      )}
      {entry.featureType === "polyline" && (
        <Field label="Arrows">
          <Select value={entry.arrowStyle} onValueChange={(v) => onUpdate({ arrowStyle: v as ArrowStyle })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{ARROW_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      )}
      {entry.featureType === "polygon" && (
        <Field label="Fill pattern">
          <div className="flex gap-1 flex-wrap">
            {FILL_PATTERNS.map((p) => (
              <Button key={p.value} variant={entry.fillPattern === p.value ? "default" : "outline"} size="xs" onClick={() => onUpdate({ fillPattern: p.value })}>
                {p.label}
              </Button>
            ))}
          </div>
        </Field>
      )}
      <Button size="xs" onClick={onClose} className="w-full">Done</Button>
    </div>
  );
}
