"use client";

import { useState, useEffect } from "react";
import { useEditor } from "@/lib/editor-context";
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
  const [color, setColor] = useState("#3b82f6");
  const [opacity, setOpacity] = useState(0.5);
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [layerId, setLayerId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!selectedFeature) return;
    setLabel(selectedFeature.label);
    setColor(selectedFeature.color);
    setOpacity(selectedFeature.opacity);
    setSourceText(selectedFeature.sourceText);
    setSourceUrl(selectedFeature.sourceUrl ?? "");
    setLayerId(selectedFeature.layerId);
  }, [selectedFeature]);

  if (!selectedFeature) return null;

  const handleSave = () => {
    updateFeature(selectedFeature.id, {
      label,
      color,
      opacity,
      sourceText,
      sourceUrl: sourceUrl || undefined,
      layerId,
    });
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
        <LayerSelect layers={layers} value={layerId} onChange={setLayerId} />
        <SourceFields
          text={sourceText}
          url={sourceUrl}
          onTextChange={setSourceText}
          onUrlChange={setSourceUrl}
        />
        <FormActions
          onSave={handleSave}
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
            min={10}
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
  onSave,
  onDelete,
}: {
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <Button onClick={onSave} className="flex-1">
        Save
      </Button>
      <Button variant="destructive" onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
