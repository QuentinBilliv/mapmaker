"use client";

import { useConvexAuth } from "convex/react";
import { EditorProvider } from "@/lib/editor-context";
import { HighlightProvider } from "@/lib/highlight-context";
import EditorShell from "@/components/editor/EditorShell";
import Dashboard from "@/components/dashboard/Dashboard";
import { ANONYMOUS_FEATURE_LIMIT } from "@/lib/defaults";


export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return (
    <EditorProvider featureLimit={ANONYMOUS_FEATURE_LIMIT} isAnonymous>
      <HighlightProvider>
        <div className="flex flex-1 overflow-hidden">
          <EditorShell />
        </div>
      </HighlightProvider>
    </EditorProvider>
  );
}
