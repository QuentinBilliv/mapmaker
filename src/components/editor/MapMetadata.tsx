"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { mapMetadataSchema, type MapMetadataFormValues } from "@/lib/schemas";
import { LICENSES } from "@/lib/defaults";
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

export default function MapMetadata() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) return <MetadataToggle onOpen={() => setIsOpen(true)} />;

  return <MetadataPanel onClose={() => setIsOpen(false)} />;
}

function MetadataToggle({ onOpen }: { onOpen: () => void }) {
  const { map } = useEditorData();

  return (
    <Button
      variant="outline"
      onClick={onOpen}
      className="absolute top-3 left-16 z-10 shadow-lg md:left-1/2 md:-translate-x-1/2"
    >
      {map.title || "Untitled"}
    </Button>
  );
}

function MetadataPanel({ onClose }: { onClose: () => void }) {
  const { map } = useEditorData();
  const { updateMap } = useEditorActions();

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
      <div className="absolute top-14 left-3 right-3 z-10 bg-popover rounded-lg shadow-lg overflow-hidden md:top-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96">
        <PanelHeader title="Metadata" onClose={() => { save(); onClose(); }} />
        <form onSubmit={save} className="p-3 space-y-3">
          <MetadataFields save={save} />
          <CoverImageUpload />
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
          placeholder="My map"
          maxLength={100}
        />
      </Field>
      <Field label="Description" error={errors.description?.message}>
        <Textarea
          {...register("description", { onBlur: save })}
          rows={2}
          maxLength={500}
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
          maxLength={200}
        />
      </Field>
    </>
  );
}

function CoverImageUpload() {
  const params = useParams();
  const mapId = params?.id as string | undefined;
  const mapData = useQuery(api.maps.getMap, mapId ? { mapId: mapId as Id<"maps"> } : "skip");
  const thumbnailUrl = useQuery(
    api.maps.getThumbnailUrl,
    mapData?.thumbnailId ? { storageId: mapData.thumbnailId } : "skip"
  );
  const generateUploadUrl = useMutation(api.maps.generateUploadUrl);
  const saveThumbnail = useMutation(api.maps.saveThumbnail);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!mapId || uploading) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) return;
      const { storageId } = await res.json();
      await saveThumbnail({ mapId: mapId as Id<"maps">, storageId });
    } catch {
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (!mapId) return null;

  return (
    <Field label="Cover image">
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full aspect-[16/9] object-cover rounded border mb-2"
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-xs"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading..." : thumbnailUrl ? "Change image" : "Upload image"}
      </Button>
    </Field>
  );
}
