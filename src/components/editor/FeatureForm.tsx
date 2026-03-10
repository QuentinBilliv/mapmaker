"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEditor } from "@/lib/editor-context";
import { featureSchema, type FeatureFormValues } from "@/lib/schemas";
import { POINT_SHAPES, LINE_STYLES, ARROW_STYLES, type LineStyle, type ArrowStyle, type FeatureData } from "@/lib/types";
import { ShapePreview } from "@/components/ui/marker-icons";
import IconPickerDialog from "@/components/editor/IconPickerDialog";
import { sanitizeSvg } from "@/lib/svg-sanitizer";
import Field from "@/components/ui/Field";
import PanelHeader from "@/components/ui/PanelHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
    borderColor: f.borderColor ?? "#ffffff",
    borderWidth: f.borderWidth ?? 6,
    smoothing: f.smoothing ?? 0,
    strokeWidth: f.strokeWidth ?? 3,
    lineStyle: f.lineStyle ?? "solid",
    arrowStyle: f.arrowStyle ?? "none",
    sourceText: f.sourceText,
    sourceUrl: f.sourceUrl ?? "",
    layerId: f.layerId,
  };
}

export default function FeatureForm() {
  const { selectedFeature, layers, updateFeature, deleteFeature, selectFeature } =
    useEditor();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const originalRef = useRef<Partial<FeatureData> | null>(null);

  const methods = useForm<FeatureFormValues>({
    resolver: zodResolver(featureSchema),
    defaultValues: selectedFeature ? featureToFormValues(selectedFeature) : undefined,
  });

  useEffect(() => {
    if (!selectedFeature) return;
    methods.reset(featureToFormValues(selectedFeature));
    if (!originalRef.current || originalRef.current.id !== selectedFeature.id) {
      originalRef.current = { ...selectedFeature };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeature]);

  const isPoint = selectedFeature?.type === "point";
  const isLine = selectedFeature?.type === "polyline";

  useEffect(() => {
    if (!selectedFeature) return;
    const sub = methods.watch((values) => {
      const result = featureSchema.safeParse(values);
      if (!result.success) {
        methods.trigger();
        return;
      }
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
        smoothing: isPoint ? 0 : v.smoothing,
        strokeWidth: isPoint ? 0 : v.strokeWidth,
        lineStyle: isPoint ? "solid" : v.lineStyle,
        arrowStyle: isLine ? v.arrowStyle : "none",
        sourceText: v.sourceText,
        sourceUrl: v.sourceUrl || undefined,
        layerId: v.layerId,
      });
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeature?.id, isPoint, isLine]);

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
          {selectedFeature.type === "point" ? (
            <PointFields />
          ) : (
            <StrokeFields showArrows={isLine} />
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
          <input
            type="color"
            {...register("color")}
            className="w-full h-8 rounded cursor-pointer"
          />
        </Field>
        <Field label={`Opacity (${Math.round(opacity * 100)}%)`} className="flex-1">
          <SliderField name="opacity" min={0} max={100} step={5} scale={100} className="mt-2" />
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
        <SliderField name="size" min={50} max={300} step={25} scale={100} />
      </Field>
      <div className="flex gap-3">
        <Field label="Border" className="flex-1">
          <input
            type="color"
            value={watch("borderColor")}
            onChange={(e) => setValue("borderColor", e.target.value)}
            className="w-full h-8 rounded cursor-pointer"
          />
        </Field>
        <Field label={`Width (${borderWidth}px)`} className="flex-1">
          <SliderField name="borderWidth" min={0} max={12} step={1} className="mt-2" />
        </Field>
      </div>
    </>
  );
}

function MarkerSelect() {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const shape = watch("shape");
  const icon = watch("icon");
  const customSvg = watch("customSvg");

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const sanitized = sanitizeSvg(reader.result as string);
        setValue("customSvg", sanitized);
        setValue("icon", undefined);
      } catch {
        alert("Invalid SVG file");
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
          />
        </div>
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

function StrokeFields({ showArrows }: { showArrows: boolean }) {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const strokeWidth = watch("strokeWidth");
  const lineStyle = watch("lineStyle");
  const arrowStyle = watch("arrowStyle");
  const smoothing = watch("smoothing");

  return (
    <>
      <div className="flex gap-3">
        <Field label={`Stroke (${strokeWidth}px)`} className="flex-1">
          <SliderField name="strokeWidth" min={1} max={10} step={1} className="mt-2" />
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
        <SliderField name="smoothing" min={0} max={100} step={5} scale={100} className="mt-2" />
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

function SliderField({
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
  const raw = watch(name) as number;
  const displayed = scale ? Math.round(raw * scale) : raw;

  return (
    <Slider
      min={min}
      max={max}
      step={step}
      value={[displayed]}
      onValueChange={(v: number[]) => setValue(name, scale ? v[0] / scale : v[0])}
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
