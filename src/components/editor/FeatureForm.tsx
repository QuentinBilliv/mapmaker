"use client";

import { useState, useEffect, useRef } from "react";
import { useEditor } from "@/lib/editor-context";
import { POINT_SHAPES, type PointShape, type FeatureData } from "@/lib/types";
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

export default function FeatureForm() {
  const { selectedFeature, layers, updateFeature, deleteFeature, selectFeature } =
    useEditor();

  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#1a1a1a");
  const [opacity, setOpacity] = useState(1);
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [layerId, setLayerId] = useState("");
  const [size, setSize] = useState(1);
  const [shape, setShape] = useState<PointShape>("circle");
  const [icon, setIcon] = useState<string | undefined>();
  const [customSvg, setCustomSvg] = useState<string | undefined>();
  const [smoothing, setSmoothing] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const originalRef = useRef<Partial<FeatureData> | null>(null);

  useEffect(() => {
    if (!selectedFeature) return;
    setLabel(selectedFeature.label);
    setColor(selectedFeature.color);
    setOpacity(selectedFeature.opacity);
    setSourceText(selectedFeature.sourceText);
    setSourceUrl(selectedFeature.sourceUrl ?? "");
    setLayerId(selectedFeature.layerId);
    setSize(selectedFeature.size ?? 1);
    setShape(selectedFeature.shape ?? "circle");
    setIcon(selectedFeature.icon);
    setCustomSvg(selectedFeature.customSvg);
    setSmoothing(selectedFeature.smoothing ?? 0);
    if (!originalRef.current || originalRef.current.id !== selectedFeature.id) {
      originalRef.current = { ...selectedFeature };
    }
  }, [selectedFeature]);

  const isPoint = selectedFeature?.type === "point";

  useEffect(() => {
    if (!selectedFeature) return;
    updateFeature(selectedFeature.id, {
      label,
      color,
      opacity,
      size: isPoint ? size : undefined,
      shape: isPoint ? (icon || customSvg ? undefined : shape) : undefined,
      icon: isPoint ? icon : undefined,
      customSvg: isPoint ? customSvg : undefined,
      smoothing: isPoint ? 0 : smoothing,
      sourceText,
      sourceUrl: sourceUrl || undefined,
      layerId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, color, opacity, size, shape, icon, customSvg, smoothing, sourceText, sourceUrl, layerId]);

  if (!selectedFeature) return null;

  const handleCancel = () => {
    if (originalRef.current) {
      updateFeature(selectedFeature.id, originalRef.current);
    }
    selectFeature(null);
  };

  return (
    <div className="absolute left-16 top-3 z-10 w-72 bg-popover rounded-lg shadow-lg overflow-hidden">
      <PanelHeader
        title={TYPE_LABELS[selectedFeature.type] ?? "Feature"}
        onClose={() => selectFeature(null)}
      />
      <div className="p-3 space-y-3">
        <StyleFields
          label={label}
          color={color}
          opacity={opacity}
          onLabelChange={setLabel}
          onColorChange={setColor}
          onOpacityChange={setOpacity}
        />
        {selectedFeature.type === "point" ? (
          <>
            <MarkerSelect
              shape={shape}
              icon={icon}
              customSvg={customSvg}
              onShapeChange={(s) => { setShape(s); setIcon(undefined); setCustomSvg(undefined); }}
              onIconChange={(i) => { setIcon(i); setShape("circle"); setCustomSvg(undefined); }}
              onCustomSvgChange={(svg) => { setCustomSvg(svg); setIcon(undefined); }}
              onClearCustom={() => { setCustomSvg(undefined); }}
            />
            <Field label={`Size (${Math.round(size * 100)}%)`}>
              <Slider
                min={50}
                max={300}
                step={25}
                value={[Math.round(size * 100)]}
                onValueChange={(v: number[]) => setSize(v[0] / 100)}
              />
            </Field>
          </>
        ) : (
          <Field label={`Smoothing (${Math.round(smoothing * 100)}%)`}>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[Math.round(smoothing * 100)]}
              onValueChange={(v: number[]) => setSmoothing(v[0] / 100)}
              className="mt-2"
            />
          </Field>
        )}
        <LayerSelect layers={layers} value={layerId} onChange={setLayerId} />
        <SourceFields
          text={sourceText}
          url={sourceUrl}
          onTextChange={setSourceText}
          onUrlChange={setSourceUrl}
        />
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
  );
}

function StyleFields({
  label,
  color,
  opacity,
  onLabelChange,
  onColorChange,
  onOpacityChange,
}: {
  label: string;
  color: string;
  opacity: number;
  onLabelChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onOpacityChange: (v: number) => void;
}) {
  return (
    <>
      <Field label="Label">
        <Input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="e.g. Roman Empire"
        />
      </Field>
      <div className="flex gap-3">
        <Field label="Color" className="flex-1">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-full h-8 rounded cursor-pointer"
          />
        </Field>
        <Field label={`Opacity (${Math.round(opacity * 100)}%)`} className="flex-1">
          <Slider
            min={0}
            max={100}
            step={5}
            value={[Math.round(opacity * 100)]}
            onValueChange={(v: number[]) => onOpacityChange(v[0] / 100)}
            className="mt-2"
          />
        </Field>
      </div>
    </>
  );
}

function MarkerSelect({
  shape,
  icon,
  customSvg,
  onShapeChange,
  onIconChange,
  onCustomSvgChange,
  onClearCustom,
}: {
  shape: PointShape;
  icon?: string;
  customSvg?: string;
  onShapeChange: (s: PointShape) => void;
  onIconChange: (i: string) => void;
  onCustomSvgChange: (svg: string) => void;
  onClearCustom: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const sanitized = sanitizeSvg(reader.result as string);
        onCustomSvgChange(sanitized);
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
              onClick={() => onShapeChange(s.value)}
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
            <Button variant="ghost" size="xs" onClick={onClearCustom}>
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
        onSelect={onIconChange}
      />
    </Field>
  );
}

function LayerSelect({
  layers,
  value,
  onChange,
}: {
  layers: { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Layer">
      <Select value={value} onValueChange={onChange}>
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

function SourceFields({
  text,
  url,
  onTextChange,
  onUrlChange,
}: {
  text: string;
  url: string;
  onTextChange: (v: string) => void;
  onUrlChange: (v: string) => void;
}) {
  return (
    <>
      <Field label="Source / Citation">
        <Textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={2}
          placeholder="e.g. Pliny the Elder, Natural History, Book III"
        />
      </Field>
      <Field label="Source URL">
        <Input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://..."
        />
      </Field>
    </>
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
