"use client";

import { useState } from "react";
import { useEditor } from "@/lib/editor-context";
import Field from "@/components/ui/Field";
import PanelHeader from "@/components/ui/PanelHeader";

const LICENSES = ["CC BY", "CC BY-SA", "CC BY-NC", "Public domain"];

export default function MapMetadata() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) return <MetadataToggle onOpen={() => setIsOpen(true)} />;

  return <MetadataPanel onClose={() => setIsOpen(false)} />;
}

function MetadataToggle({ onOpen }: { onOpen: () => void }) {
  const { map } = useEditor();

  return (
    <button
      onClick={onOpen}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {map.title || "Untitled"}
    </button>
  );
}

function MetadataPanel({ onClose }: { onClose: () => void }) {
  const { map, updateMap } = useEditor();

  const [title, setTitle] = useState(map.title);
  const [description, setDescription] = useState(map.description);
  const [tagsStr, setTagsStr] = useState(map.tags.join(", "));
  const [license, setLicense] = useState(map.license);

  const save = () => {
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    updateMap({ title, description, tags, license });
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-96 bg-white rounded-lg shadow-lg overflow-hidden">
      <PanelHeader title="Metadata" onClose={() => { save(); onClose(); }} />

      <div className="p-3 space-y-3">
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            className="w-full px-2 py-1.5 border rounded text-sm"
            placeholder="My historical map"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={save}
            className="w-full px-2 py-1.5 border rounded text-sm"
            rows={2}
          />
        </Field>
        <Field label="License">
          <select
            value={license}
            onChange={(e) => { setLicense(e.target.value); save(); }}
            className="w-full px-2 py-1.5 border rounded text-sm"
          >
            {LICENSES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Tags (comma-separated)">
          <input
            type="text"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            onBlur={save}
            className="w-full px-2 py-1.5 border rounded text-sm"
            placeholder="Rome, Mediterranean, Trade"
          />
        </Field>
      </div>
    </div>
  );
}
