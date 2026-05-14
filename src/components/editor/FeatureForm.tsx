"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { COLORS, DEFAULT_BORDER_WIDTH } from "@/lib/defaults";
import { featureSchema, type FeatureFormValues } from "@/lib/schemas";
import {
  POINT_SHAPES,
  LINE_STYLES,
  ARROW_STYLES,
  LINE_DECORATIONS,
  FILL_PATTERNS,
  type LineStyle,
  type ArrowStyle,
  type LineDecoration,
  type FillPattern,
  type FeatureData,
  type FeatureUpdate,
} from "@/lib/types";
import { ShapePreview } from "@/components/ui/marker-icons";
import IconPickerDialog from "@/components/editor/IconPickerDialog";
import CustomSvgDialog from "@/components/editor/CustomSvgDialog";
import { resolveIconToSvg } from "@/lib/icon-catalog";
import { useColorSwatches } from "@/lib/hooks/use-color-swatches";
import { useCatalogIcon } from "@/lib/hooks/use-catalog-icon";

import { FeatureSwatch } from "@/components/ui/feature-swatch";
import { legendEntryToSyntheticFeature } from "@/lib/resolve-style";
import Field from "@/components/ui/Field";
import PanelHeader from "@/components/ui/PanelHeader";
import SafeSvg from "@/components/ui/SafeSvg";
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

const TYPE_LABELS: Record<string, string> = {
  polygon: "Polygon",
  polyline: "Polyline",
  point: "Point",
  text: "Text",
};

const FORM_DEFAULTS: FeatureFormValues = {
  label: "",
  description: "",
  color: COLORS.white,
  opacity: 1,
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

const TYPE_FORM_KEYS: Record<FeatureData["type"], (keyof FeatureFormValues)[]> =
  {
    point: ["size", "shape", "customSvg", "borderColor", "borderWidth"],
    text: [
      "textContent",
      "fontSize",
      "fontFamily",
      "bold",
      "italic",
      "textBorderEnabled",
      "textBorderColor",
      "textBorderWidth",
    ],
    polyline: [
      "smoothing",
      "strokeWidth",
      "lineStyle",
      "arrowStyle",
      "lineDecoration",
      "decorationSpacing",
    ],
    polygon: [
      "smoothing",
      "strokeWidth",
      "lineStyle",
      "lineDecoration",
      "decorationSpacing",
      "fillPattern",
    ],
  };

function featureToFormValues(f: FeatureData): FeatureFormValues {
  const base = {
    ...FORM_DEFAULTS,
    label: f.label,
    description: f.description ?? "",
    imageUrl: f.imageUrl ?? "",
    color: f.color,
    opacity: f.opacity,
  };
  const keys = TYPE_FORM_KEYS[f.type];
  const overrides: Partial<FeatureFormValues> = {};
  for (const k of keys) {
    const val = (f as unknown as Record<string, unknown>)[k];
    if (val !== undefined) (overrides as Record<string, unknown>)[k] = val;
  }
  if (f.type === "text" && f.bold === undefined) overrides.bold = false;
  if (f.type === "text" && f.italic === undefined) overrides.italic = false;
  if (f.type === "point" && !f.shape) overrides.shape = "circle";
  return { ...base, ...overrides };
}

function buildFeatureUpdate(
  v: FeatureFormValues,
  type: FeatureData["type"],
): FeatureUpdate {
  const base: FeatureUpdate = {
    label: v.label,
    description: v.description ?? "",
    imageUrl: v.imageUrl?.trim() ? v.imageUrl.trim() : undefined,
    color: v.color,
    opacity: v.opacity,
  };
  switch (type) {
    case "point":
      return {
        ...base,
        size: v.size,
        shape: v.customSvg ? undefined : v.shape,
        customSvg: v.customSvg,
        borderColor: v.borderColor,
        borderWidth: v.borderWidth,
      };
    case "text":
      return {
        ...base,
        textContent: v.textContent?.trim() || v.label?.trim() || "Text",
        fontSize: v.fontSize,
        fontFamily: v.fontFamily,
        bold: v.bold,
        italic: v.italic,
        textBorderEnabled: (v.textBorderWidth ?? 0) > 0,
        textBorderColor: v.textBorderColor,
        textBorderWidth: v.textBorderWidth,
      };
    case "polyline":
      return {
        ...base,
        smoothing: v.smoothing,
        strokeWidth: v.strokeWidth,
        lineStyle: v.lineStyle,
        arrowStyle: v.arrowStyle,
        lineDecoration: v.lineDecoration,
        decorationSpacing: v.decorationSpacing,
      };
    case "polygon":
      return {
        ...base,
        smoothing: v.smoothing,
        strokeWidth: v.strokeWidth,
        lineStyle: v.lineStyle,
        lineDecoration: v.lineDecoration,
        decorationSpacing: v.decorationSpacing,
        fillPattern: v.fillPattern,
      };
  }
}

function GroupForm() {
  const { selectedFeatureIds, features, groups } = useEditorData();
  const { updateGroup, dissolveGroup, selectFeatures } = useEditorActions();

  const firstFeature = features.find((f) => f.id === selectedFeatureIds[0]);
  const group = firstFeature?.groupId
    ? groups.find((g) => g.id === firstFeature.groupId)
    : null;
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
            maxLength={100}
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
  const { updateFeature, deleteFeature, selectFeature, recordSnapshot } =
    useEditorActions();

  const originalRef = useRef<FeatureUpdate | null>(null);
  const snapshotTakenRef = useRef(false);

  const methods = useForm<FeatureFormValues>({
    resolver: zodResolver(featureSchema),
    defaultValues: selectedFeature
      ? featureToFormValues(selectedFeature)
      : undefined,
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

  useEffect(() => {
    if (!selectedFeature) return;
    const sub = methods.watch((values) => {
      if (!snapshotTakenRef.current) {
        snapshotTakenRef.current = true;
        recordSnapshot();
      }
      const result = featureSchema.safeParse(values);
      if (!result.success) return;
      updateFeature(
        selectedFeature.id,
        buildFeatureUpdate(result.data, selectedFeature.type),
      );
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeature?.id, selectedFeature?.type, updateFeature]);

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
          {(selectedFeature.type === "polygon" || selectedFeature.type === "polyline") && (
            <p className="[@media(pointer:fine)]:hidden text-xs leading-relaxed rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-2 text-amber-900 dark:text-amber-200">
              Reshaping this feature (moving its vertices) is only available on a non-touch screen. You can still edit its properties below.
            </p>
          )}
          <LegendEntryPicker feature={selectedFeature} />
          <StyleFields />
          <TypeSpecificFields feature={selectedFeature} />
          {!selectedFeature.legendEntryId && (
            <AddToLegendButton feature={selectedFeature} />
          )}
          {selectedFeature.type !== "text" && (
            <AddLabelButton featureId={selectedFeature.id} />
          )}
          {selectedFeature.type === "polygon" && (
            <>
              <PunchHoleButton featureId={selectedFeature.id} />
              <AddPolygonButton featureId={selectedFeature.id} />
            </>
          )}
        </div>
        <FormActions
          onClose={() => selectFeature(null)}
          onCancel={handleCancel}
          onDelete={() => deleteFeature(selectedFeature.id)}
        />
      </div>
    </FormProvider>
  );
}

function TypeSpecificFields({ feature }: { feature: FeatureData }) {
  const custom = !feature.legendEntryId;
  switch (feature.type) {
    case "text":
      return (
        <>
          <TextContentField />
          {custom && <TextStyleFields />}
          <CoordinateFields feature={feature} />
        </>
      );
    case "point":
      return (
        <>
          {custom && <PointFields />}
          <CoordinateFields feature={feature} />
        </>
      );
    case "polyline":
      return <>{custom && <StrokeFields showArrows />}</>;
    case "polygon":
      return (
        <>
          {custom && <StrokeFields showArrows={false} />}
          {custom && <FillPatternSelect />}
        </>
      );
  }
}

function StyleFields() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FeatureFormValues>();
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
          maxLength={100}
        />
      </Field>
      <Field label="Description" error={errors.description?.message}>
        <Textarea
          {...register("description")}
          rows={2}
          placeholder="Visible on hover"
          className="resize-y"
          maxLength={500}
        />
      </Field>
      <Field label="Image URL" error={errors.imageUrl?.message}>
        <Input
          type="url"
          {...register("imageUrl")}
          placeholder="https://example.com/photo.jpg"
          maxLength={500}
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
          <Field
            label={`Opacity (${Math.round(opacity * 100)}%)`}
            className="flex-1"
          >
            <FormSlider
              name="opacity"
              min={0}
              max={100}
              step={5}
              scale={100}
              className="mt-2"
            />
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
        <FormSlider name="size" min={10} max={300} step={5} scale={100} />
      </Field>
      {!hasCustomIcon && (
        <div className="flex gap-3">
          <Field label="Border" className="flex-1">
            <ColorInput
              value={watch("borderColor") ?? ""}
              onChange={(e) =>
                setValue("borderColor", (e.target as HTMLInputElement).value)
              }
            />
          </Field>
          <Field label={`Width (${borderWidth}px)`} className="flex-1">
            <FormSlider
              name="borderWidth"
              min={0}
              max={12}
              step={1}
              className="mt-2"
            />
          </Field>
        </div>
      )}
    </>
  );
}

function CoordinateFields({ feature }: { feature: FeatureData }) {
  const { updateFeature, recordSnapshot } = useEditorActions();
  const coords =
    feature.geometry.type === "Point" ? feature.geometry.coordinates : null;
  const [lng, setLng] = useState(
    coords ? String(Math.round(coords[0] * 1e6) / 1e6) : "",
  );
  const [lat, setLat] = useState(
    coords ? String(Math.round(coords[1] * 1e6) / 1e6) : "",
  );
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
    if (
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    )
      return;
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
          onChange={(e) => {
            setLng(e.target.value);
            commit(e.target.value, lat);
          }}
          onBlur={() => {
            const v = parseFloat(lng);
            if (!isNaN(v)) setLng(String(Math.round(v * 1e6) / 1e6));
          }}
        />
      </Field>
      <Field label="Latitude" className="flex-1">
        <Input
          type="text"
          inputMode="decimal"
          value={lat}
          onChange={(e) => {
            setLat(e.target.value);
            commit(lng, e.target.value);
          }}
          onBlur={() => {
            const v = parseFloat(lat);
            if (!isNaN(v)) setLat(String(Math.round(v * 1e6) / 1e6));
          }}
        />
      </Field>
    </div>
  );
}

function MarkerSelect() {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [svgDialogOpen, setSvgDialogOpen] = useState(false);
  const [catalogIconId, setCatalogIconId] = useState<string | null>(null);
  const shape = watch("shape");
  const customSvg = watch("customSvg");
  const SelectedIcon = useCatalogIcon(catalogIconId);

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
            <Button
              variant="default"
              size="icon-sm"
              onClick={() => setPickerOpen(true)}
            >
              <SelectedIcon size={14} />
            </Button>
          )}
          {customSvg && !catalogIconId && (
            <Button
              variant="default"
              size="icon-sm"
              onClick={() => setSvgDialogOpen(true)}
            >
              <SafeSvg
                className="w-3.5 h-3.5 block overflow-hidden [&>svg]:w-full [&>svg]:h-full"
                svg={customSvg}
              />
            </Button>
          )}
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPickerOpen(true)}
          >
            More icons
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setSvgDialogOpen(true)}
          >
            Custom SVG
          </Button>
        </div>
      </div>
      <IconPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={catalogIconId ?? undefined}
        onSelect={handleIconSelect}
      />
      <CustomSvgDialog
        open={svgDialogOpen}
        onOpenChange={setSvgDialogOpen}
        onSubmit={(svg) => {
          setValue("customSvg", svg);
          setCatalogIconId(null);
        }}
      />
    </Field>
  );
}

function TextContentField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<FeatureFormValues>();

  return (
    <Field label="Text content" error={errors.textContent?.message}>
      <Textarea
        {...register("textContent")}
        rows={3}
        placeholder="Enter your text..."
        className="resize-y"
        maxLength={1000}
      />
    </Field>
  );
}

function TextStyleFields() {
  const { watch, setValue } = useFormContext<FeatureFormValues>();
  const fontSize = watch("fontSize") ?? 24;
  const bold = watch("bold") ?? false;
  const italic = watch("italic") ?? false;
  const textBorderWidth = watch("textBorderWidth") ?? 2;

  return (
    <>
      <div className="flex gap-3 items-end">
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
        <div className="flex gap-1 pb-0.5">
          <Button
            type="button"
            variant={bold ? "default" : "outline"}
            size="icon-sm"
            onClick={() => setValue("bold", !bold)}
            title="Bold"
          >
            <span className="font-bold text-xs">B</span>
          </Button>
          <Button
            type="button"
            variant={italic ? "default" : "outline"}
            size="icon-sm"
            onClick={() => setValue("italic", !italic)}
            title="Italic"
          >
            <span className="italic text-xs">I</span>
          </Button>
        </div>
      </div>
      <div className="flex gap-3">
        <Field label="Outline color" className="flex-1">
          <ColorInput
            value={watch("textBorderColor") ?? "#ffffff"}
            onChange={(e) =>
              setValue("textBorderColor", (e.target as HTMLInputElement).value)
            }
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
          <FormSlider
            name="strokeWidth"
            min={0}
            max={10}
            step={1}
            className="mt-2"
          />
        </Field>
        <Field label="Line style" className="flex-1">
          <Select
            value={lineStyle}
            onValueChange={(v) => setValue("lineStyle", v as LineStyle)}
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
          onValueChange={(v) => setValue("lineDecoration", v as LineDecoration)}
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
          <FormSlider
            name="decorationSpacing"
            min={5}
            max={200}
            step={5}
            className="mt-2"
          />
        </Field>
      )}
      {showArrows && (
        <Field label="Arrows">
          <Select
            value={arrowStyle}
            onValueChange={(v) => setValue("arrowStyle", v as ArrowStyle)}
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
      <Field label={`Smoothing (${Math.round(smoothing * 100)}%)`}>
        <FormSlider
          name="smoothing"
          min={0}
          max={100}
          step={5}
          scale={100}
          className="mt-2"
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

function LegendEntryPicker({ feature }: { feature: FeatureData }) {
  const { legendEntries, choropleth } = useEditorData();
  const { assignLegendEntry, assignChoroplethCategory } = useEditorActions();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollHeight > el.clientHeight + 1);
    check();
    const obs = new ResizeObserver(check);
    obs.observe(el);
    return () => obs.disconnect();
  }, [legendEntries.length, choropleth]);
  const matchingEntries = legendEntries.filter(
    (e) => e.featureType === feature.type,
  );
  const choroCategories =
    choropleth.enabled && choropleth.mode === "discrete"
      ? choropleth.categories
      : [];
  if (matchingEntries.length === 0 && choroCategories.length === 0) return null;
  const isCustom = !feature.legendEntryId && !feature.choroplethCategoryId;
  type Item = {
    key: string;
    label: string;
    selected: boolean;
    onClick: () => void;
    swatch: React.ReactNode;
  };
  const items: Item[] = [
    ...matchingEntries.map<Item>((e) => ({
      key: `e:${e.id}`,
      label: e.label || "Untitled",
      selected: feature.legendEntryId === e.id,
      onClick: () => assignLegendEntry(feature.id, e.id),
      swatch: (
        <FeatureSwatch
          feature={legendEntryToSyntheticFeature(e)}
          width={20}
          height={16}
        />
      ),
    })),
    ...choroCategories.map<Item>((c) => ({
      key: `c:${c.id}`,
      label: c.label || "Untitled",
      selected: feature.choroplethCategoryId === c.id,
      onClick: () => assignChoroplethCategory(feature.id, c.id),
      swatch: (
        <span
          className="inline-block rounded-sm border border-black/10"
          style={{ width: 20, height: 16, backgroundColor: c.color }}
        />
      ),
    })),
  ].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
  const buttonClass = (selected: boolean) =>
    `flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors ${
      selected
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:border-foreground/30"
    }`;
  return (
    <Field label="Legend style">
      <div ref={scrollRef} className={`flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1 ${canScroll ? "[mask-image:linear-gradient(to_bottom,black_calc(100%-16px),transparent)]" : ""}`}>
        <button
          type="button"
          onClick={() => {
            assignLegendEntry(feature.id, null);
            assignChoroplethCategory(feature.id, null);
          }}
          className={buttonClass(isCustom)}
        >
          Custom
        </button>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={buttonClass(item.selected)}
          >
            {item.swatch}
            {item.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

function AddToLegendButton({ feature }: { feature: FeatureData }) {
  const { assignLegendEntry, deduceLegendEntryFromFeature } =
    useEditorActions();
  const inLegend = !!feature.legendEntryId;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      deduceLegendEntryFromFeature(feature.id, feature.label || "Untitled");
    } else {
      assignLegendEntry(feature.id, null);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => handleToggle(!inLegend)}
    >
      Add to legend
    </Button>
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

function PunchHoleButton({ featureId }: { featureId: string }) {
  const { startPunchHole } = useEditorActions();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => startPunchHole(featureId)}
    >
      Punch hole
    </Button>
  );
}

function AddPolygonButton({ featureId }: { featureId: string }) {
  const { startAddPolygon } = useEditorActions();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => startAddPolygon(featureId)}
    >
      Add polygon
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
    <div className="flex gap-2 p-3 border-t border-border shrink-0">
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
