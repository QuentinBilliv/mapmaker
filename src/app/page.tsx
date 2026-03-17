"use client";

import { EditorProvider } from "@/lib/editor-context";
import EditorShell from "@/components/editor/EditorShell";

export default function Home() {
  return (
    <EditorProvider>
      <div className="h-screen w-screen flex overflow-hidden">
        <EditorShell />
      </div>
    </EditorProvider>
  );
}
