"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { EditorProvider } from "@/lib/editor-context";
import { HighlightProvider } from "@/lib/highlight-context";
import EditorShell from "@/components/editor/EditorShell";
import RefTracker from "@/components/analytics/RefTracker";
import { ANONYMOUS_FEATURE_LIMIT } from "@/lib/defaults";

export default function TryPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <EditorProvider featureLimit={ANONYMOUS_FEATURE_LIMIT} isAnonymous>
      <HighlightProvider>
        <RefTracker />
        <div className="flex flex-1 overflow-hidden">
          <EditorShell />
        </div>
      </HighlightProvider>
    </EditorProvider>
  );
}
