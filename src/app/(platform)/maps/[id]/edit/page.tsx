"use client";

import ConvexEditorWrapper from "@/components/editor/ConvexEditorWrapper";
import EditorShell from "@/components/editor/EditorShell";

export default function EditMapPage({ params }: { params: { id: string } }) {
  return (
    <ConvexEditorWrapper mapId={params.id}>
      <EditorShell />
    </ConvexEditorWrapper>
  );
}
