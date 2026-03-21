"use client";

import { useState } from "react";
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
            <div className="grid grid-cols-3 gap-x-3 gap-y-1">
              {sortedEntries.map((entry) => {
                const synthetic = legendEntryToSyntheticFeature(entry);
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col items-center gap-0.5"
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

  function reset() {
    setStep("type");
    setLabel("");
    setColor(COLORS.primary);
    setOpacity(1);
    setSize(1);
    setShape("circle");
    setIcon(undefined);
    setBorderColor(COLORS.white);
    setBorderWidth(DEFAULT_BORDER_WIDTH);
    setStrokeWidth(3);
    setSmoothing(0);
    setLineStyle("solid");
    setArrowStyle("none");
    setLineDecoration("none");
    setDecorationSpacing(50);
    setFillPattern("none");
  }

  function handleCreate() {
    const base = { label: label || "New entry", color, opacity };
    if (featureType === "point") {
      onSubmit({
        ...base,
        featureType: "point",
        size,
        shape: icon ? undefined : shape,
        icon,
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
    } else {
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
              {(["point", "polyline", "polygon"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={featureType === t ? "default" : "outline"}
                  onClick={() => setFeatureType(t)}
                  className="flex-1"
                >
                  {t === "point"
                    ? "Point"
                    : t === "polyline"
                      ? "Line"
                      : "Polygon"}
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
                          !icon && shape === s.value ? "default" : "outline"
                        }
                        size="icon-xs"
                        onClick={() => {
                          setShape(s.value);
                          setIcon(undefined);
                        }}
                        title={s.label}
                      >
                        <ShapePreview shape={s.value} />
                      </Button>
                    ))}
                    <Button
                      variant={icon ? "default" : "outline"}
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
                    selected={icon}
                    onSelect={(i) => {
                      setIcon(i);
                      setShape("circle");
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
                <div className="flex gap-3">
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
                </div>
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
