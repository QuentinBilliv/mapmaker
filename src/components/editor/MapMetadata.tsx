"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useEditorData, useEditorActions } from "@/lib/editor-context";
import { mapMetadataSchema, type MapMetadataFormValues } from "@/lib/schemas";
import { LICENSES, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/defaults";
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
      <div className="absolute top-14 left-3 right-3 z-10 bg-popover rounded-lg shadow-lg overflow-hidden md:top-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 max-h-[70vh] flex flex-col">
        <PanelHeader title="Metadata" onClose={() => { save(); onClose(); }} />
        <form onSubmit={save} className="p-3 space-y-3 overflow-y-auto flex-1">
          <MetadataFields save={save} />
          <ViewControl updateMap={updateMap} center={map.center} zoom={map.zoom} />
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

function ViewControl({
  updateMap,
  center,
  zoom,
}: {
  updateMap: (updates: { center: [number, number]; zoom: number }) => void;
  center: [number, number];
  zoom: number;
}) {
  const isAuto = center[0] === DEFAULT_CENTER[0] && center[1] === DEFAULT_CENTER[1] && zoom === DEFAULT_ZOOM;

  return (
    <Field label="Initial view">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={isAuto ? "outline" : "default"}
          size="sm"
          className="flex-1 text-xs"
          onClick={() => window.dispatchEvent(new Event("idomap:save-view"))}
        >
          Save current view
        </Button>
        <Button
          type="button"
          variant={isAuto ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs"
          onClick={() => updateMap({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })}
        >
          Auto-fit
        </Button>
      </div>
    </Field>
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
  const removeThumbnail = useMutation(api.maps.removeThumbnail);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
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
      void fetch("/api/revalidate-og", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId }),
      }).catch(() => {});
    } catch {
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [mapId, uploading, generateUploadUrl, saveThumbnail]);

  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile],
  );

  if (!mapId) return null;

  return (
    <Field label="Cover image">
      {thumbnailUrl && (
        <div className="relative group mb-2">
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full aspect-[16/9] object-cover rounded border"
          />
          <button
            type="button"
            onClick={() => {
              void removeThumbnail({ mapId: mapId as Id<"maps"> });
              void fetch("/api/revalidate-og", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mapId }),
              }).catch(() => {});
            }}
            className="absolute top-1 right-1 rounded-full bg-black/60 hover:bg-black/80 text-white w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-muted-foreground/50"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="text-xs text-muted-foreground text-center">
          {uploading ? "Uploading..." : "Drop an image or click to browse"}
        </span>
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
      </div>
    </Field>
  );
}
