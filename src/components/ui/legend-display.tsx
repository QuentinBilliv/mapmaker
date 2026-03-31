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

interface LegendDisplayProps {
  features: FeatureData[];
  legendEntries?: LegendEntry[];
  onAdd?: (entry: NewLegendEntry) => void;
  alwaysShow?: boolean;
}

export function LegendDisplay({
  legendEntries = [],
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
  const hasItems = sortedEntries.length > 0;

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
          {hasItems ? (
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
          ) : (
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
  const [featureType, setFeatureType] = useState<LegendFeatureType>("point");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLORS.primary);
  const [opacity, setOpacity] = useState(1);
  const [size, setSize] = useState(1);
  const [shape, setShape] = useState<PointShape>("circle");
  const [catalogIconId, setCatalogIconId] = useState<string | null>(null);
  const [customSvg, setCustomSvg] = useState<string | undefined>();
  const SelectedIcon = useCatalogIcon(catalogIconId);
  const [borderColor, setBorderColor] = useState(COLORS.white);
  const [borderWidth, setBorderWidth] = useState(DEFAULT_BORDER_WIDTH);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [smoothing, setSmoothing] = useState(0);
  const [lineStyle, setLineStyle] = useState<LineStyle>("solid");
  const [arrowStyle, setArrowStyle] = useState<ArrowStyle>("none");
  const [lineDecoration, setLineDecoration] = useState<LineDecoration>("none");
  const [decorationSpacing, setDecorationSpacing] = useState(50);
  const [fillPattern, setFillPattern] = useState<FillPattern>("none");
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState<TextFont>("sans");
  const [textBorderColor, setTextBorderColor] = useState(COLORS.white);
  const [textBorderWidth, setTextBorderWidth] = useState(2);
  const [pickerOpen, setPickerOpen] = useState(false);

  function reset() {
    setStep("type");
    setLabel("");
    setColor(COLORS.primary);
    setOpacity(1);
    setSize(1);
    setShape("circle");
    setCatalogIconId(null);
    setCustomSvg(undefined);
    setBorderColor(COLORS.white);
    setBorderWidth(DEFAULT_BORDER_WIDTH);
    setStrokeWidth(3);
    setSmoothing(0);
    setLineStyle("solid");
    setArrowStyle("none");
    setLineDecoration("none");
    setDecorationSpacing(50);
    setFillPattern("none");
    setFontSize(16);
    setFontFamily("sans");
    setTextBorderColor(COLORS.white);
    setTextBorderWidth(2);
  }

  function handleCreate() {
    const base = { label: label || "New entry", color, opacity };
    if (featureType === "point") {
      onSubmit({
        ...base,
        featureType: "point",
        size,
        shape: customSvg ? undefined : shape,
        customSvg,
        borderColor,
        borderWidth,
      });
    } else if (featureType === "polyline") {
      onSubmit({
        ...base,
        featureType: "polyline",
        smoothing,
        strokeWidth,
        lineStyle,
        arrowStyle,
        lineDecoration,
        decorationSpacing,
      });
    } else if (featureType === "polygon") {
      onSubmit({
        ...base,
        featureType: "polygon",
        smoothing,
        strokeWidth,
        lineStyle,
        lineDecoration,
        decorationSpacing,
        fillPattern,
      });
    } else {
      onSubmit({
        ...base,
        featureType: "text",
        fontSize,
        fontFamily,
        textBorderEnabled: textBorderWidth > 0,
        textBorderColor,
        textBorderWidth,
      });
    }
    reset();
  }

  function handleCancel() {
    reset();
    onOpenChange(false);
  }

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
                  variant={featureType === t ? "default" : "outline"}
                  onClick={() => setFeatureType(t)}
                  className="flex-1"
                >
                  {t === "point" ? "Point" : t === "polyline" ? "Line" : t === "polygon" ? "Polygon" : "Text"}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => setStep("style")}>
                Next
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 px-1 max-h-[60vh] overflow-y-auto pr-1">
            <Field label="Label">
              <Input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Naval bases"
                className="h-8 text-sm"
                maxLength={50}
              />
            </Field>
            <div className="flex gap-3">
              <Field label="Color" className="flex-1">
                <ColorInput
                  value={color}
                  onChange={(e) =>
                    setColor((e.target as HTMLInputElement).value)
                  }
                />
              </Field>
              <Field
                label={`Opacity (${Math.round(opacity * 100)}%)`}
                className="flex-1"
              >
                <SliderField
                  value={opacity}
                  onChange={setOpacity}
                  min={0}
                  max={100}
                  step={5}
                  scale={100}
                  className="mt-2"
                />
              </Field>
            </div>
            {featureType === "point" && (
              <>
                <Field label="Marker">
                  <div className="flex gap-1 flex-wrap">
                    {POINT_SHAPES.map((s) => (
                      <Button
                        key={s.value}
                        variant={
                          !customSvg && shape === s.value ? "default" : "outline"
                        }
                        size="icon-sm"
                        onClick={() => {
                          setShape(s.value);
                          setCatalogIconId(null);
                          setCustomSvg(undefined);
                        }}
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
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setPickerOpen(true)}
                    >
                      More icons
                    </Button>
                  </div>
                  <IconPickerDialog
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    selected={catalogIconId ?? undefined}
                    onSelect={async (i) => {
                      const svg = await resolveIconToSvg(i);
                      if (svg) {
                        setCustomSvg(svg);
                        setShape("circle");
                        setCatalogIconId(i);
                      }
                    }}
                  />
                </Field>
                <Field label={`Size (${Math.round(size * 100)}%)`}>
                  <SliderField
                    value={size}
                    onChange={setSize}
                    min={50}
                    max={300}
                    step={25}
                    scale={100}
                  />
                </Field>
                {!customSvg && <div className="flex gap-3">
                  <Field label="Border color" className="flex-1">
                    <ColorInput
                      value={borderColor}
                      onChange={(e) =>
                        setBorderColor((e.target as HTMLInputElement).value)
                      }
                    />
                  </Field>
                  <Field label={`Width (${borderWidth}px)`} className="flex-1">
                    <SliderField
                      value={borderWidth}
                      onChange={setBorderWidth}
                      min={0}
                      max={12}
                      step={1}
                      className="mt-2"
                    />
                  </Field>
                </div>}
              </>
            )}
            {(featureType === "polyline" || featureType === "polygon") && (
              <>
                <div className="flex gap-3">
                  <Field label={`Stroke (${strokeWidth}px)`} className="flex-1">
                    <SliderField
                      value={strokeWidth}
                      onChange={setStrokeWidth}
                      min={1}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </Field>
                  <Field label="Line style" className="flex-1">
                    <Select
                      value={lineStyle}
                      onValueChange={(v) => setLineStyle(v as LineStyle)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINE_STYLES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Line decoration">
                  <Select
                    value={lineDecoration}
                    onValueChange={(v) =>
                      setLineDecoration(v as LineDecoration)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LINE_DECORATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {lineDecoration !== "none" && (
                  <Field label={`Decoration spacing (${decorationSpacing}px)`}>
                    <SliderField
                      value={decorationSpacing}
                      onChange={setDecorationSpacing}
                      min={5}
                      max={200}
                      step={5}
                    />
                  </Field>
                )}
                <Field label={`Smoothing (${Math.round(smoothing * 100)}%)`}>
                  <SliderField
                    value={smoothing}
                    onChange={setSmoothing}
                    min={0}
                    max={100}
                    step={5}
                    scale={100}
                  />
                </Field>
              </>
            )}
            {featureType === "polyline" && (
              <Field label="Arrows">
                <Select
                  value={arrowStyle}
                  onValueChange={(v) => setArrowStyle(v as ArrowStyle)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARROW_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {featureType === "polygon" && (
              <Field label="Fill pattern">
                <div className="flex gap-1 flex-wrap">
                  {FILL_PATTERNS.map((p) => (
                    <Button
                      key={p.value}
                      variant={fillPattern === p.value ? "default" : "outline"}
                      size="xs"
                      onClick={() => setFillPattern(p.value)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </Field>
            )}
            {featureType === "text" && (
              <>
                <Field label={`Font size (${fontSize}px)`}>
                  <SliderField value={fontSize} onChange={setFontSize} min={8} max={72} step={1} className="mt-2" />
                </Field>
                <div className="flex gap-3">
                  <Field label="Outline color" className="flex-1">
                    <ColorInput value={textBorderColor} onChange={(e) => setTextBorderColor((e.target as HTMLInputElement).value)} />
                  </Field>
                  <Field label={`Outline (${textBorderWidth}px)`} className="flex-1">
                    <SliderField value={textBorderWidth} onChange={setTextBorderWidth} min={0} max={8} step={1} className="mt-2" />
                  </Field>
                </div>
              </>
            )}
            <DialogFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStep("type")}
              >
                Back
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate}>
                Create
              </Button>
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalogIconId, setCatalogIconId] = useState<string | null>(null);
  const SelectedIcon = useCatalogIcon(catalogIconId);
  const isStroke = entry.featureType === "polyline" || entry.featureType === "polygon";

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
          <div className="flex gap-3">
            <Field label="Color" className="flex-1">
              <ColorInput value={entry.color} onChange={(e) => onUpdate({ color: (e.target as HTMLInputElement).value })} />
            </Field>
            <Field label={`Opacity (${Math.round(entry.opacity * 100)}%)`} className="flex-1">
              <SliderField value={entry.opacity} onChange={(v) => onUpdate({ opacity: v })} min={0} max={100} step={5} scale={100} className="mt-2" />
            </Field>
          </div>
          {entry.featureType === "point" && (
            <>
              <Field label="Marker">
                <div className="flex gap-1 flex-wrap">
                  {POINT_SHAPES.map((s) => (
                    <Button key={s.value} variant={!entry.customSvg && entry.shape === s.value ? "default" : "outline"} size="icon-sm" onClick={() => { onUpdate({ shape: s.value, customSvg: undefined }); setCatalogIconId(null); }} title={s.label}>
                      <ShapePreview shape={s.value} />
                    </Button>
                  ))}
                  {SelectedIcon && (
                    <Button variant="default" size="icon-sm" onClick={() => setPickerOpen(true)}>
                      <SelectedIcon size={14} />
                    </Button>
                  )}
                  <Button variant="outline" size="xs" onClick={() => setPickerOpen(true)}>More icons</Button>
                </div>
                <IconPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} selected={catalogIconId ?? undefined} onSelect={async (i) => { const svg = await resolveIconToSvg(i); if (svg) { onUpdate({ customSvg: svg, shape: "circle" }); setCatalogIconId(i); } }} />
              </Field>
              <Field label={`Size (${Math.round(entry.size * 100)}%)`}>
                <SliderField value={entry.size} onChange={(v) => onUpdate({ size: v })} min={50} max={300} step={25} scale={100} />
              </Field>
              {!entry.customSvg && (
                <div className="flex gap-3">
                  <Field label="Border color" className="flex-1">
                    <ColorInput value={entry.borderColor} onChange={(e) => onUpdate({ borderColor: (e.target as HTMLInputElement).value })} />
                  </Field>
                  <Field label={`Width (${entry.borderWidth}px)`} className="flex-1">
                    <SliderField value={entry.borderWidth} onChange={(v) => onUpdate({ borderWidth: v })} min={0} max={12} step={1} className="mt-2" />
                  </Field>
                </div>
              )}
            </>
          )}
          {isStroke && (
            <>
              <div className="flex gap-3">
                <Field label={`Stroke (${entry.strokeWidth}px)`} className="flex-1">
                  <SliderField value={entry.strokeWidth} onChange={(v) => onUpdate({ strokeWidth: v })} min={1} max={10} step={1} className="mt-2" />
                </Field>
                <Field label="Line style" className="flex-1">
                  <Select value={entry.lineStyle} onValueChange={(v) => onUpdate({ lineStyle: v as LineStyle })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{LINE_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Line decoration">
                <Select value={entry.lineDecoration} onValueChange={(v) => onUpdate({ lineDecoration: v as LineDecoration })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{LINE_DECORATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              {entry.lineDecoration !== "none" && (
                <Field label={`Decoration spacing (${entry.decorationSpacing}px)`}>
                  <SliderField value={entry.decorationSpacing} onChange={(v) => onUpdate({ decorationSpacing: v })} min={5} max={200} step={5} />
                </Field>
              )}
              <Field label={`Smoothing (${Math.round(entry.smoothing * 100)}%)`}>
                <SliderField value={entry.smoothing} onChange={(v) => onUpdate({ smoothing: v })} min={0} max={100} step={5} scale={100} />
              </Field>
            </>
          )}
          {entry.featureType === "polyline" && (
            <Field label="Arrows">
              <Select value={entry.arrowStyle} onValueChange={(v) => onUpdate({ arrowStyle: v as ArrowStyle })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
          {entry.featureType === "text" && (
            <>
              <div className="flex gap-3">
                <Field label={`Font size (${entry.fontSize}px)`} className="flex-1">
                  <SliderField value={entry.fontSize} onChange={(v) => onUpdate({ fontSize: v })} min={8} max={72} step={1} className="mt-2" />
                </Field>
              </div>
              <div className="flex gap-3">
                <Field label="Outline color" className="flex-1">
                  <ColorInput value={entry.textBorderColor} onChange={(e) => onUpdate({ textBorderColor: (e.target as HTMLInputElement).value })} />
                </Field>
                <Field label={`Outline (${entry.textBorderWidth}px)`} className="flex-1">
                  <SliderField value={entry.textBorderWidth} onChange={(v) => onUpdate({ textBorderWidth: v })} min={0} max={8} step={1} className="mt-2" />
                </Field>
              </div>
            </>
          )}
          <DialogFooter>
            <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
