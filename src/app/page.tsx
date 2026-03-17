"use client";

import { useConvexAuth } from "convex/react";
import { EditorProvider } from "@/lib/editor-context";
import EditorShell from "@/components/editor/EditorShell";
import Navbar from "@/components/layout/Navbar";
import Dashboard from "@/components/dashboard/Dashboard";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <Navbar />
        <Dashboard />
      </div>
    );
  }

  return (
    <EditorProvider>
      <div className="h-screen w-screen flex overflow-hidden">
        <EditorShell />
      </div>
    </EditorProvider>
  );
}
