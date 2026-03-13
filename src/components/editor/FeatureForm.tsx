"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { COLORS, DEFAULT_BORDER_WIDTH } from "@/lib/defaults";
import { featureSchema, type FeatureFormValues } from "@/lib/schemas";
import { POINT_SHAPES, LINE_STYLES, ARROW_STYLES, LINE_DECORATIONS, FILL_PATTERNS, TEXT_FONTS, type LineStyle, type ArrowStyle, type LineDecoration, type FillPattern, type TextFont, type FeatureData } from "@/lib/types";
import { ShapePreview } from "@/components/ui/marker-icons";
import IconPickerDialog from "@/components/editor/IconPickerDialog";
import { sanitizeSvg } from "@/lib/svg-sanitizer";
import Field from "@/components/ui/Field";
import PanelHeader from "@/components/ui/PanelHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import SliderField from "@/components/ui/SliderField";
import ColorInput from "@/components/ui/ColorInput";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_LABELS: Record<string, string> = {
  polygon: "Polygon",
  polyline: "Polyline",
  point: "Point",
  text: "Text",
};

function featureToFormValues(f: FeatureData): FeatureFormValues {
  return {
    label: f.label,
    color: f.color,
    opacity: f.opacity,
    size: f.size ?? 1,
    shape: f.shape ?? "circle",
    icon: f.icon,
    customSvg: f.customSvg,
    borderColor: f.borderColor ?? COLORS.white,
    borderWidth: f.borderWidth ?? DEFAULT_BORDER_WIDTH,
    smoothing: f.smoothing ?? 0,
    strokeWidth: f.strokeWidth ?? 3,
    lineStyle: f.lineStyle ?? "solid",
    arrowStyle: f.arrowStyle ?? "none",
    lineDecoration: f.lineDecoration ?? "none",
    decorationSpacing: f.decorationSpacing ?? 50,
    fillPattern: f.fillPattern ?? "none",
    textContent: f.textContent ?? "",
    fontSize: f.fontSize ?? 24,
    fontFamily: f.fontFamily ?? "sans",
    textBorderEnabled: f.textBorderEnabled ?? true,
    textBorderColor: f.textBorderColor ?? COLORS.white,
    textBorderWidth: f.textBorderWidth ?? 2,
    sourceText: f.sourceText,
    sourceUrl: f.sourceUrl ?? "",
    layerId: f.layerId,
  };
}

export default function FeatureForm() {
  const { selectedFeature, layers } = useEditorData();
  const { updateFeature, deleteFeature, selectFeature, recordSnapshot } = useEditorActions();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const originalRef = useRef<Partial<FeatureData> | null>(null);
  const snapshotTakenRef = useRef(false);

  const methods = useForm<FeatureFormValues>({
    resolver: zodResolver(featureSchema),
    defaultValues: selectedFeature ? featureToFormValues(selectedFeature) : undefined,
    mode: "onChange",
  });

  const featureId = selectedFeature?.id;
  useEffect(() => {
    if (!selectedFeature) return;
    methods.reset(featureToFormValues(selectedFeature));
    originalRef.current = { ...selectedFeature };
    snapshotTakenRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  const isPoint = selectedFeature?.type === "point";
  const isLine = selectedFeature?.type === "polyline";
  const isText = selectedFeature?.type === "text";

  useEffect(() => {
    if (!selectedFeature) return;
    const sub = methods.watch((values) => {
      if (!snapshotTakenRef.current) {
        snapshotTakenRef.current = true;
        recordSnapshot();
      }
      const result = featureSchema.safeParse(values);
      if (!result.success) return;
      const v = result.data;
      updateFeature(selectedFeature.id, {
        label: v.label,
        color: v.color,
        opacity: v.opacity,
        size: isPoint ? v.size : undefined,
        shape: isPoint ? (v.icon || v.customSvg ? undefined : v.shape) : undefined,
        icon: isPoint ? v.icon : undefined,
        customSvg: isPoint ? v.customSvg : undefined,
        borderColor: isPoint ? v.borderColor : undefined,
        borderWidth: isPoint ? v.borderWidth : undefined,
        smoothing: (isPoint || isText) ? 0 : v.smoothing,
        strokeWidth: (isPoint || isText) ? 0 : v.strokeWidth,
        lineStyle: (isPoint || isText) ? "solid" : v.lineStyle,
        arrowStyle: isLine ? v.arrowStyle : "none",
        lineDecoration: (isPoint || isText) ? "none" : v.lineDecoration,
        decorationSpacing: (isPoint || isText) ? 50 : v.decorationSpacing,
        fillPattern: (!isPoint && !isLine && !isText) ? v.fillPattern : "none",
        textContent: isText ? v.textContent : undefined,
        fontSize: isText ? v.fontSize : undefined,
        fontFamily: isText ? v.fontFamily : undefined,
        textBorderEnabled: isText ? v.textBorderEnabled : undefined,
        textBorderColor: isText ? v.textBorderColor : undefined,
        textBorderWidth: isText ? v.textBorderWidth : undefined,
        sourceText: v.sourceText,
        sourceUrl: v.sourceUrl || undefined,
        layerId: v.layerId,
      });
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeature?.id, isPoint, isLine, isText, updateFeature]);

  if (!selectedFeature) return null;

  const handleCancel = () => {
    if (originalRef.current) {
      updateFeature(selectedFeature.id, originalRef.current);
    }
    selectFeature(null);
  };

  return (
    <FormProvider {...methods}>
      <div className="absolute left-16 top-3 z-10 w-72 bg-popover rounded-lg shadow-lg overflow-hidden">
        <PanelHeader
          title={TYPE_LABELS[selectedFeature.type] ?? "Feature"}
          onClose={() => selectFeature(null)}
        />
        <div className="p-3 space-y-3">
          <StyleFields />
          {selectedFeature.type === "text" ? (
            <TextFields />
          ) : selectedFeature.type === "point" ? (
            <PointFields />
          ) : (
            <>
              <StrokeFields showArrows={isLine} />
              {selectedFeature.type === "polygon" && <FillPatternSelect />}
            </>
          )}
          <LayerSelect layers={layers} />
          <SourceFields />
          <FormActions
            onClose={() => selectFeature(null)}
            onCancel={handleCancel}
            onDelete={() => setConfirmOpen(true)}
          />
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Delete this feature?"
            description="This action cannot be undone."
            onConfirm={() => deleteFeature(selectedFeature.id)}
          />
        </div>
      </div>
    </FormProvider>
  );
}

function StyleFields() {
  const { register, watch, formState: { errors } } = useFormContext<FeatureFormValues>();
  const opacity = watch("opacity");

  return (
    <>
      <Field label="Label" error={errors.label?.message}>
        <Input
          type="text"
          {...register("label")}
          placeholder="e.g. Roman Empire"
        />
      </Field>
      <div className="flex gap-3">
        <Field label="Color" className="flex-1" error={errors.color?.message}>
          <ColorInput {...register("color")} />
        </Field>
        <Field label={`Opacity (${Math.round(opacity * 100)}%)`} className="flex-1">
          <FormSlider name="opacity" min={0} max={100} step={5} scale={100} className="mt-2" />
        </Field>
      </div>
    </>
  );
}

function PointFields() {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const size = watch("size");
  const borderWidth = watch("borderWidth");

  return (
    <>
      <MarkerSelect />
      <Field label={`Size (${Math.round(size * 100)}%)`}>
        <FormSlider name="size" min={50} max={300} step={25} scale={100} />
      </Field>
      <div className="flex gap-3">
        <Field label="Border" className="flex-1">
          <ColorInput
            value={watch("borderColor")}
            onChange={(e) => setValue("borderColor", (e.target as HTMLInputElement).value)}
          />
        </Field>
        <Field label={`Width (${borderWidth}px)`} className="flex-1">
          <FormSlider name="borderWidth" min={0} max={12} step={1} className="mt-2" />
        </Field>
      </div>
    </>
  );
}

function MarkerSelect() {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [svgError, setSvgError] = useState<string | null>(null);
  const shape = watch("shape");
  const icon = watch("icon");
  const customSvg = watch("customSvg");

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSvgError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const sanitized = sanitizeSvg(reader.result as string);
        setValue("customSvg", sanitized);
        setValue("icon", undefined);
      } catch {
        setSvgError("Invalid SVG file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Field label="Marker">
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1 flex-wrap">
          {POINT_SHAPES.map((s) => (
            <Button
              key={s.value}
              variant={!icon && !customSvg && shape === s.value ? "default" : "outline"}
              size="icon-xs"
              onClick={() => {
                setValue("shape", s.value);
                setValue("icon", undefined);
                setValue("customSvg", undefined);
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
        <div className="flex gap-1 items-center">
          <Button
            variant={customSvg ? "default" : "outline"}
            size="xs"
            onClick={() => fileRef.current?.click()}
          >
            {customSvg ? "Replace SVG" : "Upload SVG"}
          </Button>
          {customSvg && (
            <Button variant="ghost" size="xs" onClick={() => setValue("customSvg", undefined)}>
              ✕
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".svg"
            onChange={handleUpload}
            className="hidden"
            aria-label="Upload SVG marker"
          />
        </div>
        {svgError && (
          <p className="text-xs text-destructive">{svgError}</p>
        )}
      </div>
      <IconPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={icon}
        onSelect={(i) => {
          setValue("icon", i);
          setValue("shape", "circle");
          setValue("customSvg", undefined);
        }}
      />
    </Field>
  );
}

function TextFields() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<FeatureFormValues>();
  const fontSize = watch("fontSize") ?? 24;
  const fontFamily = watch("fontFamily") ?? "sans";
  const textBorderEnabled = watch("textBorderEnabled") ?? true;
  const textBorderWidth = watch("textBorderWidth") ?? 2;

  return (
    <>
      <Field label="Text content" error={errors.textContent?.message}>
        <Textarea
          {...register("textContent")}
          rows={3}
          placeholder="Enter your text..."
          className="resize-y"
        />
      </Field>
      <div className="flex gap-3">
        <Field label={`Size (${fontSize}px)`} className="flex-1">
          <SliderField
            value={fontSize}
            onChange={(v) => setValue("fontSize", v)}
            min={8}
            max={72}
            step={1}
            className="mt-2"
          />
        </Field>
        <Field label="Font" className="flex-1">
          <Select value={fontFamily} onValueChange={(v) => setValue("fontFamily", v as TextFont)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEXT_FONTS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex gap-3 items-end">
        <Field label="Text outline" className="shrink-0">
          <Button
            type="button"
            variant={textBorderEnabled ? "default" : "outline"}
            size="xs"
            onClick={() => setValue("textBorderEnabled", !textBorderEnabled)}
          >
            {textBorderEnabled ? "On" : "Off"}
          </Button>
        </Field>
        {textBorderEnabled && (
          <>
            <Field label="Color" className="flex-1">
              <ColorInput
                value={watch("textBorderColor") ?? "#ffffff"}
                onChange={(e) => setValue("textBorderColor", (e.target as HTMLInputElement).value)}
              />
            </Field>
            <Field label={`Width (${textBorderWidth}px)`} className="flex-1">
              <SliderField
                value={textBorderWidth}
                onChange={(v) => setValue("textBorderWidth", v)}
                min={0}
                max={5}
                step={0.5}
                className="mt-2"
              />
            </Field>
          </>
        )}
      </div>
    </>
  );
}

function StrokeFields({ showArrows }: { showArrows: boolean }) {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const strokeWidth = watch("strokeWidth");
  const lineStyle = watch("lineStyle");
  const arrowStyle = watch("arrowStyle");
  const lineDecoration = watch("lineDecoration");
  const decorationSpacing = watch("decorationSpacing");
  const smoothing = watch("smoothing");

  return (
    <>
      <div className="flex gap-3">
        <Field label={`Stroke (${strokeWidth}px)`} className="flex-1">
          <FormSlider name="strokeWidth" min={1} max={10} step={1} className="mt-2" />
        </Field>
        <Field label="Line style" className="flex-1">
          <Select value={lineStyle} onValueChange={(v) => setValue("lineStyle", v as LineStyle)}>
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
        <Select value={lineDecoration} onValueChange={(v) => setValue("lineDecoration", v as LineDecoration)}>
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
      {lineDecoration !== "none" && (
        <Field label={`Decoration spacing (${decorationSpacing}px)`}>
          <FormSlider name="decorationSpacing" min={5} max={200} step={5} className="mt-2" />
        </Field>
      )}
      {showArrows && (
        <Field label="Arrows">
          <Select value={arrowStyle} onValueChange={(v) => setValue("arrowStyle", v as ArrowStyle)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARROW_STYLES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      <Field label={`Smoothing (${Math.round(smoothing * 100)}%)`}>
        <FormSlider name="smoothing" min={0} max={100} step={5} scale={100} className="mt-2" />
      </Field>
    </>
  );
}

function LayerSelect({ layers }: { layers: { id: string; name: string }[] }) {
  const { watch, setValue, formState: { errors } } = useFormContext<FeatureFormValues>();
  const layerId = watch("layerId");

  return (
    <Field label="Layer" error={errors.layerId?.message}>
      <Select value={layerId} onValueChange={(v) => setValue("layerId", v)}>
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
  );
}

function SourceFields() {
  const { register, formState: { errors } } = useFormContext<FeatureFormValues>();

  return (
    <>
      <Field label="Source / Citation" error={errors.sourceText?.message}>
        <Textarea
          {...register("sourceText")}
          rows={2}
          placeholder="e.g. Pliny the Elder, Natural History, Book III"
        />
      </Field>
      <Field label="Source URL" error={errors.sourceUrl?.message}>
        <Input
          type="url"
          {...register("sourceUrl")}
          placeholder="https://..."
        />
      </Field>
    </>
  );
}

function FillPatternSelect() {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const fillPattern = watch("fillPattern");

  return (
    <Field label="Fill pattern">
      <div className="flex gap-1 flex-wrap">
        {FILL_PATTERNS.map((p) => (
          <Button
            key={p.value}
            variant={fillPattern === p.value ? "default" : "outline"}
            size="xs"
            onClick={() => setValue("fillPattern", p.value as FillPattern)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </Field>
  );
}

function FormSlider({
  name,
  min,
  max,
  step,
  scale,
  className,
}: {
  name: keyof FeatureFormValues;
  min: number;
  max: number;
  step: number;
  scale?: number;
  className?: string;
}) {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const raw = watch(name) as number | undefined;

  return (
    <SliderField
      value={raw ?? 0}
      onChange={(v) => setValue(name, v)}
      min={min}
      max={max}
      step={step}
      scale={scale}
      className={className}
    />
  );
}

function FormActions({
  onClose,
  onCancel,
  onDelete,
}: {
  onClose: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <Button onClick={onClose} className="flex-1">
        OK
      </Button>
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
