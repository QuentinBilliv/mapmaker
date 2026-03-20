"use client";

import { EditorProvider } from "@/lib/editor-context";
import { useConvexPersistence } from "@/lib/hooks/use-convex-persistence";

export default function ConvexEditorWrapper({
  mapId,
  children,
}: {
  mapId: string;
  children: React.ReactNode;
}) {
  const { initialData, onSave, saveError, isLoading, notFound } =
    useConvexPersistence(mapId);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  if (notFound || !initialData) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Map not found or access denied.
        </p>
      </div>
    );
  }

  return (
    <EditorProvider initialData={initialData} onSave={onSave}>
      {saveError && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-500 text-white text-sm text-center px-4 py-2">
          {saveError}
        </div>
      )}
      {children}
    </EditorProvider>
  );
}
