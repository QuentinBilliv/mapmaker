"use client";

import { useState, useEffect } from "react";
import { useEditor } from "@/lib/editor-context";
import Field from "@/components/ui/Field";
import PanelHeader from "@/components/ui/PanelHeader";

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
    <div className="absolute left-16 top-3 z-10 w-72 bg-white rounded-lg shadow-lg overflow-hidden">
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
          onDelete={() => {
            if (confirm("Delete this feature?")) deleteFeature(selectedFeature.id);
          }}
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
        <input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          className="w-full px-2 py-1.5 border rounded text-sm"
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
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            className="w-full mt-2 accent-blue-600"
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border rounded text-sm"
      >
        {layers.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
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
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full px-2 py-1.5 border rounded text-sm"
          rows={2}
          placeholder="e.g. Pliny the Elder, Natural History, Book III"
        />
      </Field>
      <Field label="Source URL">
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          className="w-full px-2 py-1.5 border rounded text-sm"
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
      <button
        onClick={onSave}
        className="flex-1 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
      >
        Save
      </button>
      <button
        onClick={onDelete}
        className="py-1.5 px-3 bg-red-50 text-red-600 rounded text-sm hover:bg-red-100"
      >
        Delete
      </button>
    </div>
  );
}
