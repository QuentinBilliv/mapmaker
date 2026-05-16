"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FeatureSwatch } from "@/components/ui/feature-swatch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Field from "@/components/ui/Field";
import ColorInput from "@/components/ui/ColorInput";
import SliderField from "@/components/ui/SliderField";
import { ShapePreview } from "@/components/ui/marker-icons";
import IconPickerDialog from "@/components/editor/IconPickerDialog";
import { useCatalogIcon } from "@/lib/hooks/use-catalog-icon";
import { resolveIconToSvg } from "@/lib/icon-catalog";
import type {
  FeatureData,
  LegendEntry,
  NewLegendEntry,
  LegendFeatureType,
  PointShape,
  LineStyle,
  ArrowStyle,
  LineDecoration,
  FillPattern,
  TextFont,
  ChoroplethCategory,
} from "@/lib/types";
import {
  POINT_SHAPES,
  LINE_STYLES,
  ARROW_STYLES,
  LINE_DECORATIONS,
  FILL_PATTERNS,
} from "@/lib/types";
import { COLORS, DEFAULT_BORDER_WIDTH } from "@/lib/defaults";
import { legendEntryToSyntheticFeature } from "@/lib/resolve-style";
import { useHighlight } from "@/lib/highlight-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChoroplethGradientInfo {
  colors: [string, string];
  label: string;
  min: number;
  max: number;
}

interface LegendDisplayProps {
  features: FeatureData[];
  legendEntries?: LegendEntry[];
  choroplethCategories?: ChoroplethCategory[];
  choroplethGradient?: ChoroplethGradientInfo;
  onAdd?: (entry: NewLegendEntry) => void;
  alwaysShow?: boolean;
}

function formatGradientValue(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(v < 10 ? 2 : 1);
}

export function LegendDisplay({
  legendEntries = [],
  choroplethCategories = [],
  choroplethGradient,
  onAdd,
  alwaysShow,
}: LegendDisplayProps) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setHoveredLegendEntryId } = useHighlight();

  const onLegendMouseMove = useCallback((e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-legend-id]");
    setHoveredLegendEntryId(el?.dataset.legendId ?? null);
  }, [setHoveredLegendEntryId]);

  const onLegendMouseLeave = useCallback(() => {
    setHoveredLegendEntryId(null);
  }, [setHoveredLegendEntryId]);

  const sortedEntries = [...legendEntries].sort((a, b) => a.order - b.order);
  const sortedChoropleth = [...choroplethCategories].sort((a, b) => a.order - b.order);
  const hasItems = sortedEntries.length > 0 || sortedChoropleth.length > 0 || !!choroplethGradient;

  if (!hasItems && !alwaysShow) return null;

  return (
    <div className="absolute bottom-8 left-3 z-10">
      {open ? (
        <div className="bg-popover/90 backdrop-blur-sm rounded-lg shadow-lg p-3 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">
              Legend
            </span>
            <div className="flex items-center gap-1">
              {onAdd && (
                <button
                  onClick={() => setDialogOpen(true)}
                  className="text-muted-foreground hover:text-foreground text-sm leading-none px-1"
                  title="Add legend entry"
                >
                  +
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs leading-none p-0.5"
              >
                x
              </button>
            </div>
          </div>
          {sortedEntries.length > 0 && (
            <div className="grid grid-cols-3" onMouseMove={onLegendMouseMove} onMouseLeave={onLegendMouseLeave}>
              {sortedEntries.map((entry) => {
                const synthetic = legendEntryToSyntheticFeature(entry);
                return (
                  <div
                    key={entry.id}
                    data-legend-id={entry.id}
                    className="flex flex-col items-center gap-0.5 cursor-default rounded px-2 py-1.5 hover:ring-1 hover:ring-primary/40"
                  >
                    <FeatureSwatch feature={synthetic} />
                    {entry.label && (
                      <span className="text-[10px] text-foreground text-center leading-tight break-words max-w-20">
                        {entry.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {sortedChoropleth.length > 0 && (
            <>
              {sortedEntries.length > 0 && <div className="border-t my-1" />}
              <div className="grid grid-cols-3" onMouseMove={onLegendMouseMove} onMouseLeave={onLegendMouseLeave}>
                {sortedChoropleth.map((cat) => (
                  <div key={cat.id} data-legend-id={cat.id} className="flex flex-col items-center gap-0.5 cursor-default rounded px-2 py-1.5 hover:ring-1 hover:ring-primary/40">
                    <div className="w-5 h-4 rounded-sm border border-black/10" style={{ backgroundColor: cat.color }} />
                    <span className="text-[10px] text-foreground text-center leading-tight break-words max-w-20">
                      {cat.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {choroplethGradient && (
            <>
              {(sortedEntries.length > 0 || sortedChoropleth.length > 0) && <div className="border-t my-1" />}
              <div
                className="px-1 py-1 cursor-default rounded hover:ring-1 hover:ring-primary/40"
                data-legend-id="__gradient__"
                onMouseEnter={() => setHoveredLegendEntryId("__gradient__")}
                onMouseLeave={() => setHoveredLegendEntryId(null)}
              >
                {choroplethGradient.label && (
                  <span className="text-[10px] text-foreground block mb-0.5">{choroplethGradient.label}</span>
                )}
                <div
                  className="h-3 rounded-sm border border-black/10"
                  style={{ background: `linear-gradient(to right, ${choroplethGradient.colors[0]}, ${choroplethGradient.colors[1]})` }}
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px] text-muted-foreground">{formatGradientValue(choroplethGradient.min)}</span>
                  <span className="text-[9px] text-muted-foreground">{formatGradientValue(choroplethGradient.max)}</span>
                </div>
              </div>
            </>
          )}
          {!hasItems && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              No legend entries yet. Click + to add one.
            </p>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="text-xs bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(true)}
        >
          Legend
        </Button>
      )}
      {onAdd && (
        <CreateEntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={(entry) => {
            onAdd(entry);
            setDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

type StyleUpdate = Partial<{
  label: string;
  color: string;
  opacity: number;
  hoverColor: string | undefined;
  size: number;
  shape: PointShape;
  customSvg: string | undefined;
  borderColor: string;
  borderWidth: number;
  smoothing: number;
  strokeWidth: number;
  lineStyle: LineStyle;
  arrowStyle: ArrowStyle;
  lineDecoration: LineDecoration;
  decorationSpacing: number;
  fillPattern: FillPattern;
  fontSize: number;
  fontFamily: TextFont;
  bold: boolean;
  italic: boolean;
  textBorderEnabled: boolean;
  textBorderColor: string;
  textBorderWidth: number;
}>;

function ColorOpacityFields({ color, opacity, onChange }: { color: string; opacity: number; onChange: (u: StyleUpdate) => void }) {
  return (
    <div className="flex gap-3">
      <Field label="Color" className="flex-1">
        <ColorInput value={color} onChange={(e) => onChange({ color: (e.target as HTMLInputElement).value })} />
      </Field>
      <Field label={`Opacity (${Math.round(opacity * 100)}%)`} className="flex-1">
        <SliderField value={opacity} onChange={(v) => onChange({ opacity: v })} min={0} max={100} step={5} scale={100} className="mt-2" />
      </Field>
    </div>
  );
}

function PointStyleFields({ entry, onChange }: { entry: Omit<import("@/lib/types").PointLegendEntry, "id" | "order">; onChange: (u: StyleUpdate) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalogIconId, setCatalogIconId] = useState<string | null>(null);
  const SelectedIcon = useCatalogIcon(catalogIconId);

  return (
    <>
      <Field label="Marker">
        <div className="flex gap-1 flex-wrap">
          {POINT_SHAPES.map((s) => (
            <Button
              key={s.value}
              variant={!entry.customSvg && entry.shape === s.value ? "default" : "outline"}
              size="icon-sm"
              onClick={() => { onChange({ shape: s.value, customSvg: undefined }); setCatalogIconId(null); }}
              title={s.label}
            >
              <ShapePreview shape={s.value} />
            </Button>
          ))}
          {SelectedIcon && (
            <Button variant="default" size="icon-sm" onClick={() => setPickerOpen(true)}>
              <SelectedIcon size={14} />
            </Button>
          )}
          <Button variant="outline" size="xs" onClick={() => setPickerOpen(true)}>
            More icons
          </Button>
        </div>
        <IconPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          selected={catalogIconId ?? undefined}
          onSelect={async (i) => {
            const svg = await resolveIconToSvg(i);
            if (svg) { onChange({ customSvg: svg, shape: "circle" }); setCatalogIconId(i); }
          }}
        />
      </Field>
      <Field label={`Size (${Math.round(entry.size * 100)}%)`}>
        <SliderField value={entry.size} onChange={(v) => onChange({ size: v })} min={10} max={300} step={5} scale={100} />
      </Field>
      {!entry.customSvg && (
        <div className="flex gap-3">
          <Field label="Border color" className="flex-1">
            <ColorInput value={entry.borderColor} onChange={(e) => onChange({ borderColor: (e.target as HTMLInputElement).value })} />
          </Field>
          <Field label={`Width (${entry.borderWidth}px)`} className="flex-1">
            <SliderField value={entry.borderWidth} onChange={(v) => onChange({ borderWidth: v })} min={0} max={12} step={1} className="mt-2" />
          </Field>
        </div>
      )}
    </>
  );
}

function StrokeStyleFields({ entry, onChange }: { entry: { strokeWidth: number; lineStyle: LineStyle; lineDecoration: LineDecoration; decorationSpacing: number; smoothing: number }; onChange: (u: StyleUpdate) => void }) {
  return (
    <>
      <div className="flex gap-3">
        <Field label={`Stroke (${entry.strokeWidth}px)`} className="flex-1">
          <SliderField value={entry.strokeWidth} onChange={(v) => onChange({ strokeWidth: v })} min={0} max={10} step={1} className="mt-2" />
        </Field>
        <Field label="Line style" className="flex-1">
          <Select value={entry.lineStyle} onValueChange={(v) => onChange({ lineStyle: v as LineStyle })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{LINE_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Line decoration">
        <Select value={entry.lineDecoration} onValueChange={(v) => onChange({ lineDecoration: v as LineDecoration })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{LINE_DECORATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      {entry.lineDecoration !== "none" && (
        <Field label={`Decoration spacing (${entry.decorationSpacing}px)`}>
          <SliderField value={entry.decorationSpacing} onChange={(v) => onChange({ decorationSpacing: v })} min={5} max={200} step={5} />
        </Field>
      )}
      <Field label={`Smoothing (${Math.round(entry.smoothing * 100)}%)`}>
        <SliderField value={entry.smoothing} onChange={(v) => onChange({ smoothing: v })} min={0} max={100} step={5} scale={100} />
      </Field>
    </>
  );
}

function ArrowField({ value, onChange }: { value: ArrowStyle; onChange: (u: StyleUpdate) => void }) {
  return (
    <Field label="Arrows">
      <Select value={value} onValueChange={(v) => onChange({ arrowStyle: v as ArrowStyle })}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{ARROW_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  );
}

function HoverColorField({ value, fallback, onChange }: { value: string | undefined; fallback: string; onChange: (u: StyleUpdate) => void }) {
  const enabled = !!value;
  return (
    <Field label="Hover highlight">
      <div className="flex gap-2 items-center">
        <Button
          type="button"
          variant={enabled ? "default" : "outline"}
          size="xs"
          onClick={() => onChange({ hoverColor: enabled ? undefined : fallback })}
        >
          {enabled ? "Custom color" : "Use entry color"}
        </Button>
        {enabled && (
          <div className="flex-1">
            <ColorInput value={value ?? fallback} onChange={(e) => onChange({ hoverColor: (e.target as HTMLInputElement).value })} />
          </div>
        )}
      </div>
    </Field>
  );
}

function FillPatternField({ value, onChange }: { value: FillPattern; onChange: (u: StyleUpdate) => void }) {
  return (
    <Field label="Fill pattern">
      <div className="flex gap-1 flex-wrap">
        {FILL_PATTERNS.map((p) => (
          <Button key={p.value} variant={value === p.value ? "default" : "outline"} size="xs" onClick={() => onChange({ fillPattern: p.value })}>
            {p.label}
          </Button>
        ))}
      </div>
    </Field>
  );
}

function TextStyleFields({ entry, onChange }: { entry: Omit<import("@/lib/types").TextLegendEntry, "id" | "order">; onChange: (u: StyleUpdate) => void }) {
  return (
    <>
      <div className="flex gap-3 items-end">
        <Field label={`Font size (${entry.fontSize}px)`} className="flex-1">
          <SliderField value={entry.fontSize} onChange={(v) => onChange({ fontSize: v })} min={8} max={72} step={1} className="mt-2" />
        </Field>
        <div className="flex gap-1 pb-0.5">
          <Button type="button" variant={entry.bold ? "default" : "outline"} size="icon-sm" onClick={() => onChange({ bold: !entry.bold })} title="Bold">
            <span className="font-bold text-xs">B</span>
          </Button>
          <Button type="button" variant={entry.italic ? "default" : "outline"} size="icon-sm" onClick={() => onChange({ italic: !entry.italic })} title="Italic">
            <span className="italic text-xs">I</span>
          </Button>
        </div>
      </div>
      <div className="flex gap-3">
        <Field label="Outline color" className="flex-1">
          <ColorInput value={entry.textBorderColor} onChange={(e) => onChange({ textBorderColor: (e.target as HTMLInputElement).value })} />
        </Field>
        <Field label={`Outline (${entry.textBorderWidth}px)`} className="flex-1">
          <SliderField value={entry.textBorderWidth} onChange={(v) => onChange({ textBorderWidth: v, textBorderEnabled: v > 0 })} min={0} max={8} step={1} className="mt-2" />
        </Field>
      </div>
    </>
  );
}

function EntryStyleFields({ entry, onChange }: { entry: NewLegendEntry; onChange: (u: StyleUpdate) => void }) {
  return (
    <>
      <ColorOpacityFields color={entry.color} opacity={entry.opacity} onChange={onChange} />
      {entry.featureType === "point" && <PointStyleFields entry={entry} onChange={onChange} />}
      {(entry.featureType === "polyline" || entry.featureType === "polygon") && <StrokeStyleFields entry={entry} onChange={onChange} />}
      {entry.featureType === "polyline" && <ArrowField value={entry.arrowStyle} onChange={onChange} />}
      {entry.featureType === "polygon" && <FillPatternField value={entry.fillPattern} onChange={onChange} />}
      {entry.featureType === "polygon" && <HoverColorField value={entry.hoverColor} fallback={entry.color} onChange={onChange} />}
      {entry.featureType === "text" && <TextStyleFields entry={entry} onChange={onChange} />}
    </>
  );
}

const CREATE_DEFAULTS: Record<LegendFeatureType, NewLegendEntry> = {
  point: { featureType: "point", label: "", color: COLORS.primary, opacity: 1, size: 1, shape: "circle", customSvg: undefined, borderColor: COLORS.white, borderWidth: DEFAULT_BORDER_WIDTH },
  polyline: { featureType: "polyline", label: "", color: COLORS.primary, opacity: 1, smoothing: 0, strokeWidth: 3, lineStyle: "solid", arrowStyle: "none", lineDecoration: "none", decorationSpacing: 50 },
  polygon: { featureType: "polygon", label: "", color: COLORS.primary, opacity: 1, smoothing: 0, strokeWidth: 3, lineStyle: "solid", lineDecoration: "none", decorationSpacing: 50, fillPattern: "none" },
  text: { featureType: "text", label: "", color: COLORS.primary, opacity: 1, fontSize: 16, fontFamily: "sans", bold: false, italic: false, textBorderEnabled: true, textBorderColor: COLORS.white, textBorderWidth: 2 },
};

export function CreateEntryDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: NewLegendEntry) => void;
}) {
  const [step, setStep] = useState<"type" | "style">("type");
  const [entry, setEntry] = useState<NewLegendEntry>(CREATE_DEFAULTS.point);

  const reset = () => {
    setStep("type");
    setEntry(CREATE_DEFAULTS.point);
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  const handleTypeChange = (t: LegendFeatureType) => {
    setEntry((prev) => ({ ...CREATE_DEFAULTS[t], label: prev.label, color: prev.color, opacity: prev.opacity }));
  };

  const handleChange = (u: StyleUpdate) => {
    setEntry((prev) => ({ ...prev, ...u }) as NewLegendEntry);
  };

  const handleCreate = () => {
    const finalEntry = { ...entry, label: entry.label || "New entry" } as NewLegendEntry;
    onSubmit(finalEntry);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-sm">New legend entry</DialogTitle>
        </DialogHeader>
        {step === "type" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Choose the feature type for this entry
            </p>
            <div className="flex gap-2">
              {(["point", "polyline", "polygon", "text"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={entry.featureType === t ? "default" : "outline"}
                  onClick={() => handleTypeChange(t)}
                  className="flex-1"
                >
                  {t === "point" ? "Point" : t === "polyline" ? "Line" : t === "polygon" ? "Polygon" : "Text"}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button size="sm" onClick={() => setStep("style")}>Next</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 px-1 max-h-[60vh] overflow-y-auto pr-1">
            <Field label="Label">
              <Input
                autoFocus
                value={entry.label}
                onChange={(e) => handleChange({ label: e.target.value })}
                placeholder="e.g. Naval bases"
                className="h-8 text-sm"
                maxLength={50}
              />
            </Field>
            <EntryStyleFields entry={entry} onChange={handleChange} />
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setStep("type")}>Back</Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button size="sm" onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditEntryDialog({
  open,
  onOpenChange,
  entry,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: LegendEntry;
  onUpdate: (updates: Partial<LegendEntry>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-sm">Edit legend entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <Field label="Label">
            <Input value={entry.label} onChange={(e) => onUpdate({ label: e.target.value })} className="h-8 text-sm" maxLength={50} />
          </Field>
          <EntryStyleFields entry={entry} onChange={(u) => onUpdate(u as Partial<LegendEntry>)} />
          <DialogFooter>
            <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
