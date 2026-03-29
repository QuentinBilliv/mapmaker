"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { COLORS, DEFAULT_BORDER_WIDTH } from "@/lib/defaults";
import { featureSchema, type FeatureFormValues } from "@/lib/schemas";
import { POINT_SHAPES, LINE_STYLES, ARROW_STYLES, LINE_DECORATIONS, FILL_PATTERNS, type LineStyle, type ArrowStyle, type LineDecoration, type FillPattern, type FeatureData, type FeatureUpdate } from "@/lib/types";
import { ShapePreview } from "@/components/ui/marker-icons";
import IconPickerDialog from "@/components/editor/IconPickerDialog";
import { sanitizeSvg } from "@/lib/svg-sanitizer";
import { resolveIconToSvg } from "@/lib/icon-catalog";
import { useColorSwatches } from "@/lib/hooks/use-color-swatches";
import { useCatalogIcon } from "@/lib/hooks/use-catalog-icon";

import { FeatureSwatch } from "@/components/ui/feature-swatch";
import { legendEntryToSyntheticFeature } from "@/lib/resolve-style";
import Field from "@/components/ui/Field";
import PanelHeader from "@/components/ui/PanelHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import SliderField from "@/components/ui/SliderField";
import ColorInput from "@/components/ui/ColorInput";
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
  const defaults: FeatureFormValues = {
    label: f.label,
    description: f.description ?? "",
    color: f.color,
    opacity: f.opacity,
    layerId: f.layerId,
    size: 1,
    shape: "circle",
    customSvg: undefined,
    borderColor: COLORS.white,
    borderWidth: DEFAULT_BORDER_WIDTH,
    smoothing: 0,
    strokeWidth: 3,
    lineStyle: "solid",
    arrowStyle: "none",
    lineDecoration: "none",
    decorationSpacing: 50,
    fillPattern: "none",
    textContent: "",
    fontSize: 24,
    fontFamily: "sans",
    textBorderEnabled: true,
    textBorderColor: COLORS.white,
    textBorderWidth: 2,
  };
  switch (f.type) {
    case "point":
      return { ...defaults, size: f.size, shape: f.shape ?? "circle", customSvg: f.customSvg, borderColor: f.borderColor, borderWidth: f.borderWidth };
    case "text":
      return { ...defaults, textContent: f.textContent, fontSize: f.fontSize, fontFamily: f.fontFamily, textBorderEnabled: f.textBorderEnabled, textBorderColor: f.textBorderColor, textBorderWidth: f.textBorderWidth };
    case "polyline":
      return { ...defaults, smoothing: f.smoothing, strokeWidth: f.strokeWidth, lineStyle: f.lineStyle, arrowStyle: f.arrowStyle, lineDecoration: f.lineDecoration, decorationSpacing: f.decorationSpacing };
    case "polygon":
      return { ...defaults, smoothing: f.smoothing, strokeWidth: f.strokeWidth, lineStyle: f.lineStyle, lineDecoration: f.lineDecoration, decorationSpacing: f.decorationSpacing, fillPattern: f.fillPattern };
  }
}

function GroupForm() {
  const { selectedFeatureIds, features, groups } = useEditorData();
  const { updateGroup, dissolveGroup, selectFeatures } = useEditorActions();

  const firstFeature = features.find((f) => f.id === selectedFeatureIds[0]);
  const group = firstFeature?.groupId ? groups.find((g) => g.id === firstFeature.groupId) : null;
  if (!group) return null;

  return (
    <div className="absolute left-3 top-16 right-3 z-20 bg-popover rounded-lg shadow-lg overflow-hidden md:left-16 md:top-3 md:right-auto md:w-72">
      <PanelHeader title="Group" onClose={() => selectFeatures([])} />
      <div className="p-3 space-y-3">
        <Field label="Group label">
          <Input
            type="text"
            value={group.label}
            onChange={(e) => updateGroup(group.id, { label: e.target.value })}
            placeholder="e.g. Legend block"
          />
        </Field>
        <div className="text-xs text-muted-foreground">
          {selectedFeatureIds.length} features in group
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={() => selectFeatures([])} className="flex-1">
            OK
          </Button>
          <Button variant="outline" onClick={() => dissolveGroup(group.id)}>
            Ungroup
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FeatureForm() {
  const { selectedFeature, selectedFeatureIds } = useEditorData();
  const { updateFeature, deleteFeature, selectFeature, recordSnapshot } = useEditorActions();

  const originalRef = useRef<FeatureUpdate | null>(null);
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
        description: v.description ?? "",
        color: v.color,
        opacity: v.opacity,
        size: isPoint ? v.size : undefined,
        shape: isPoint ? (v.customSvg ? undefined : v.shape) : undefined,
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
        textBorderEnabled: isText ? (v.textBorderWidth ?? 0) > 0 : undefined,
        textBorderColor: isText ? v.textBorderColor : undefined,
        textBorderWidth: isText ? v.textBorderWidth : undefined,
        layerId: v.layerId,
      });
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeature?.id, isPoint, isLine, isText, updateFeature]);

  if (selectedFeatureIds.length > 1) return <GroupForm />;
  if (!selectedFeature) return null;

  const handleCancel = () => {
    if (originalRef.current) {
      updateFeature(selectedFeature.id, originalRef.current);
    }
    selectFeature(null);
  };

  return (
    <FormProvider {...methods}>
      <div className="absolute left-3 top-16 right-3 z-20 max-h-[80vh] bg-popover rounded-lg shadow-lg overflow-hidden flex flex-col md:left-16 md:top-3 md:right-auto md:w-72">
        <PanelHeader
          title={TYPE_LABELS[selectedFeature.type] ?? "Feature"}
          onClose={() => selectFeature(null)}
        />
        <div className="p-3 space-y-3 overflow-y-auto">
          <LegendEntryPicker feature={selectedFeature} />
          <StyleFields />
          {selectedFeature.type === "text" ? (
            <>
              <TextContentField />
              {!selectedFeature.legendEntryId && <TextStyleFields />}
              <CoordinateFields feature={selectedFeature} />
            </>
          ) : selectedFeature.type === "point" ? (
            <>
              {!selectedFeature.legendEntryId && <PointFields />}
              <CoordinateFields feature={selectedFeature} />
            </>
          ) : (
            <>
              {!selectedFeature.legendEntryId && <StrokeFields showArrows={isLine} />}
              {!selectedFeature.legendEntryId && selectedFeature.type === "polygon" && <FillPatternSelect />}
            </>
          )}
          {!selectedFeature.legendEntryId && <LegendEntryToggle feature={selectedFeature} />}
          {selectedFeature.type !== "text" && <AddLabelButton featureId={selectedFeature.id} />}
          <FormActions
            onClose={() => selectFeature(null)}
            onCancel={handleCancel}
            onDelete={() => deleteFeature(selectedFeature.id)}
          />
        </div>
      </div>
    </FormProvider>
  );
}

function StyleFields() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<FeatureFormValues>();
  const { features, selectedFeature } = useEditorData();
  const swatches = useColorSwatches(features);
  const opacity = watch("opacity");
  const hasLegendEntry = !!selectedFeature?.legendEntryId;

  return (
    <>
      <Field label="Label" error={errors.label?.message}>
        <Input
          type="text"
          {...register("label")}
          placeholder="e.g. Roman Empire"
        />
      </Field>
      <Field label="Description" error={errors.description?.message}>
        <Textarea
          {...register("description")}
          rows={2}
          placeholder="Visible on hover"
          className="resize-y"
        />
      </Field>
      {!hasLegendEntry && (
        <div className="flex gap-3">
          <Field label="Color" className="flex-1" error={errors.color?.message}>
            <ColorInput
              {...register("color")}
              swatches={swatches}
              onColorSelect={(c) => setValue("color", c)}
            />
          </Field>
          <Field label={`Opacity (${Math.round(opacity * 100)}%)`} className="flex-1">
            <FormSlider name="opacity" min={0} max={100} step={5} scale={100} className="mt-2" />
          </Field>
        </div>
      )}
    </>
  );
}

function PointFields() {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const size = watch("size");
  const borderWidth = watch("borderWidth");
  const customSvg = watch("customSvg");
  const hasCustomIcon = !!customSvg;

  return (
    <>
      <MarkerSelect />
      <Field label={`Size (${Math.round(size * 100)}%)`}>
        <FormSlider name="size" min={50} max={300} step={25} scale={100} />
      </Field>
      {!hasCustomIcon && (
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
      )}
    </>
  );
}

function CoordinateFields({ feature }: { feature: FeatureData }) {
  const { updateFeature, recordSnapshot } = useEditorActions();
  const coords = feature.geometry.type === "Point" ? feature.geometry.coordinates : null;
  const [lng, setLng] = useState(coords ? String(Math.round(coords[0] * 1e6) / 1e6) : "");
  const [lat, setLat] = useState(coords ? String(Math.round(coords[1] * 1e6) / 1e6) : "");
  const snapshotTakenRef = useRef(false);

  useEffect(() => {
    if (!coords) return;
    setLng(String(Math.round(coords[0] * 1e6) / 1e6));
    setLat(String(Math.round(coords[1] * 1e6) / 1e6));
    snapshotTakenRef.current = false;
  }, [coords?.[0], coords?.[1]]);

  if (!coords) return null;

  const commit = (newLng: string, newLat: string) => {
    const parsedLng = parseFloat(newLng);
    const parsedLat = parseFloat(newLat);
    if (isNaN(parsedLng) || isNaN(parsedLat)) return;
    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) return;
    if (!snapshotTakenRef.current) {
      snapshotTakenRef.current = true;
      recordSnapshot();
    }
    updateFeature(feature.id, {
      geometry: { type: "Point", coordinates: [parsedLng, parsedLat] },
    });
  };

  return (
    <div className="flex gap-3">
      <Field label="Longitude" className="flex-1">
        <Input
          type="text"
          inputMode="decimal"
          value={lng}
          onChange={(e) => { setLng(e.target.value); commit(e.target.value, lat); }}
          onBlur={() => { const v = parseFloat(lng); if (!isNaN(v)) setLng(String(Math.round(v * 1e6) / 1e6)); }}
        />
      </Field>
      <Field label="Latitude" className="flex-1">
        <Input
          type="text"
          inputMode="decimal"
          value={lat}
          onChange={(e) => { setLat(e.target.value); commit(lng, e.target.value); }}
          onBlur={() => { const v = parseFloat(lat); if (!isNaN(v)) setLat(String(Math.round(v * 1e6) / 1e6)); }}
        />
      </Field>
    </div>
  );
}

function MarkerSelect() {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [svgError, setSvgError] = useState<string | null>(null);
  const [catalogIconId, setCatalogIconId] = useState<string | null>(null);
  const shape = watch("shape");
  const customSvg = watch("customSvg");
  const SelectedIcon = useCatalogIcon(catalogIconId);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSvgError(null);
    if (file.size > 256 * 1024) {
      setSvgError("SVG file must be under 256 KB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const sanitized = sanitizeSvg(reader.result as string);
        setValue("customSvg", sanitized);
        setCatalogIconId(null);
      } catch {
        setSvgError("Invalid SVG file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleIconSelect = async (iconId: string) => {
    const svg = await resolveIconToSvg(iconId);
    if (svg) {
      setValue("customSvg", svg);
      setValue("shape", "circle");
      setCatalogIconId(iconId);
    }
  };

  return (
    <Field label="Marker">
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1 flex-wrap">
          {POINT_SHAPES.map((s) => (
            <Button
              key={s.value}
              variant={!customSvg && shape === s.value ? "default" : "outline"}
              size="icon-sm"
              onClick={() => {
                setValue("shape", s.value);
                setValue("customSvg", undefined);
                setCatalogIconId(null);
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
        <div className="flex gap-1 items-center">
          <Button
            variant={customSvg ? "default" : "outline"}
            size="xs"
            onClick={() => fileRef.current?.click()}
          >
            {customSvg ? "Replace SVG" : "Upload SVG"}
          </Button>
          {customSvg && (
            <Button variant="ghost" size="xs" onClick={() => { setValue("customSvg", undefined); setCatalogIconId(null); }}>
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
        selected={catalogIconId ?? undefined}
        onSelect={handleIconSelect}
      />
    </Field>
  );
}

function TextContentField() {
  const { register, formState: { errors } } = useFormContext<FeatureFormValues>();

  return (
    <Field label="Text content" error={errors.textContent?.message}>
      <Textarea
        {...register("textContent")}
        rows={3}
        placeholder="Enter your text..."
        className="resize-y"
      />
    </Field>
  );
}

function TextStyleFields() {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const fontSize = watch("fontSize") ?? 24;
  const textBorderWidth = watch("textBorderWidth") ?? 2;

  return (
    <>
      <Field label={`Size (${fontSize}px)`}>
        <SliderField
          value={fontSize}
          onChange={(v) => setValue("fontSize", v)}
          min={8}
          max={72}
          step={1}
          className="mt-2"
        />
      </Field>
      <div className="flex gap-3">
        <Field label="Outline color" className="flex-1">
          <ColorInput
            value={watch("textBorderColor") ?? "#ffffff"}
            onChange={(e) => setValue("textBorderColor", (e.target as HTMLInputElement).value)}
          />
        </Field>
        <Field label={`Outline (${textBorderWidth}px)`} className="flex-1">
          <SliderField
            value={textBorderWidth}
            onChange={(v) => setValue("textBorderWidth", v)}
            min={0}
            max={5}
            step={0.5}
            className="mt-2"
          />
        </Field>
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

function LegendEntryPicker({ feature }: { feature: FeatureData }) {
  const { legendEntries } = useEditorData();
  const { assignLegendEntry } = useEditorActions();
  const matchingEntries = legendEntries.filter((e) => e.featureType === feature.type);
  if (matchingEntries.length === 0) return null;
  return (
    <Field label="Legend style">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => assignLegendEntry(feature.id, null)}
          className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors ${
            !feature.legendEntryId
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-foreground/30"
          }`}
        >
          Custom
        </button>
        {matchingEntries.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => assignLegendEntry(feature.id, e.id)}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors ${
              feature.legendEntryId === e.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            <FeatureSwatch feature={legendEntryToSyntheticFeature(e)} width={20} height={16} />
            {e.label || "Untitled"}
          </button>
        ))}
      </div>
    </Field>
  );
}

function LegendEntryToggle({ feature }: { feature: FeatureData }) {
  const { assignLegendEntry, deduceLegendEntryFromFeature } = useEditorActions();
  const inLegend = !!feature.legendEntryId;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      deduceLegendEntryFromFeature(feature.id, feature.label || "Untitled");
    } else {
      assignLegendEntry(feature.id, null);
    }
  };

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={inLegend} onCheckedChange={handleToggle} />
      <span className="text-xs">Add to legend</span>
    </label>
  );
}

function AddLabelButton({ featureId }: { featureId: string }) {
  const { addLabelToFeature } = useEditorActions();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => addLabelToFeature(featureId)}
    >
      Add label on map
    </Button>
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
