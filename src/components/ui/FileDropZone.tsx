"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  accept: string;
  maxSizeKB?: number;
  label?: string;
  onFile: (content: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

export default function FileDropZone({
  accept,
  maxSizeKB = 256,
  label = "Drop a file here or click to browse",
  onFile,
  onError,
  className,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (maxSizeKB && file.size > maxSizeKB * 1024) {
        onError?.(`File must be under ${maxSizeKB} KB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => onFile(reader.result as string);
      reader.onerror = () => onError?.("Failed to read file");
      reader.readAsText(file);
    },
    [maxSizeKB, onFile, onError],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 cursor-pointer transition-colors",
        dragging ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-muted-foreground/50",
        className,
      )}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span className="text-sm text-muted-foreground text-center">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
