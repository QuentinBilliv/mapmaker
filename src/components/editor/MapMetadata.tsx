"use client";

import { useState } from "react";
import { useEditor } from "@/lib/editor-context";
import Field from "@/components/ui/Field";
import PanelHeader from "@/components/ui/PanelHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LICENSES = ["CC BY", "CC BY-SA", "CC BY-NC", "Public domain"];

export default function MapMetadata() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) return <MetadataToggle onOpen={() => setIsOpen(true)} />;

  return <MetadataPanel onClose={() => setIsOpen(false)} />;
}

function MetadataToggle({ onOpen }: { onOpen: () => void }) {
  const { map } = useEditor();

  return (
    <Button
      variant="outline"
      onClick={onOpen}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-10 shadow-lg"
    >
      {map.title || "Untitled"}
    </Button>
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
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-96 bg-popover rounded-lg shadow-lg overflow-hidden">
      <PanelHeader title="Metadata" onClose={() => { save(); onClose(); }} />
      <div className="p-3 space-y-3">
        <Field label="Title">
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            placeholder="My historical map"
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={save}
            rows={2}
          />
        </Field>
        <Field label="License">
          <Select value={license} onValueChange={(v) => { setLicense(v); save(); }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LICENSES.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tags (comma-separated)">
          <Input
            type="text"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            onBlur={save}
            placeholder="Rome, Mediterranean, Trade"
          />
        </Field>
      </div>
    </div>
  );
}
