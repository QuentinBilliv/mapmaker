"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEditor } from "@/lib/editor-context";
import { mapMetadataSchema, type MapMetadataFormValues } from "@/lib/schemas";
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

  const methods = useForm<MapMetadataFormValues>({
    resolver: zodResolver(mapMetadataSchema),
    defaultValues: {
      title: map.title,
      description: map.description,
      license: map.license as MapMetadataFormValues["license"],
      tagsStr: map.tags.join(", "),
    },
  });

  const save = methods.handleSubmit((data) => {
    const tags = data.tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    updateMap({ title: data.title, description: data.description, tags, license: data.license });
  });

  const license = methods.watch("license");

  useEffect(() => {
    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [license]);

  return (
    <FormProvider {...methods}>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-96 bg-popover rounded-lg shadow-lg overflow-hidden">
        <PanelHeader title="Metadata" onClose={() => { save(); onClose(); }} />
        <form onSubmit={save} className="p-3 space-y-3">
          <MetadataFields save={save} />
        </form>
      </div>
    </FormProvider>
  );
}

function MetadataFields({ save }: { save: () => void }) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<MapMetadataFormValues>();
  const license = watch("license");

  return (
    <>
      <Field label="Title" error={errors.title?.message}>
        <Input
          type="text"
          {...register("title", { onBlur: save })}
          placeholder="My historical map"
        />
      </Field>
      <Field label="Description" error={errors.description?.message}>
        <Textarea
          {...register("description", { onBlur: save })}
          rows={2}
        />
      </Field>
      <Field label="License" error={errors.license?.message}>
        <Select
          value={license}
          onValueChange={(v) => setValue("license", v as MapMetadataFormValues["license"])}
        >
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
      <Field label="Tags (comma-separated)" error={errors.tagsStr?.message}>
        <Input
          type="text"
          {...register("tagsStr", { onBlur: save })}
          placeholder="Rome, Mediterranean, Trade"
        />
      </Field>
    </>
  );
}
