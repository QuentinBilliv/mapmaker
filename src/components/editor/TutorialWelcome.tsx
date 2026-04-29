"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "idomaps:tutorial-done";

export default function TutorialWelcome() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to idomaps</DialogTitle>
          <DialogDescription>
            Here is how the editor is organized:
          </DialogDescription>
        </DialogHeader>
        <dl className="text-sm space-y-3 py-2">
          <div>
            <dt className="font-medium">Toolbar (left)</dt>
            <dd className="text-muted-foreground">Pick a tool to draw polygons, lines, points, arrows, and more.</dd>
          </div>
          <div>
            <dt className="font-medium">Map (center)</dt>
            <dd className="text-muted-foreground">Click and draw directly on the map. Click a shape to select and edit it.</dd>
          </div>
          <div>
            <dt className="font-medium">Features (right, top)</dt>
            <dd className="text-muted-foreground">All your shapes appear here. Rename, reorder, or group them.</dd>
          </div>
          <div>
            <dt className="font-medium">Legend (right, bottom)</dt>
            <dd className="text-muted-foreground">Create categories with colors and styles, then assign them to your shapes.</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground border-t pt-3">
          You can explore freely without an account. <Link href="/signup" className="text-primary underline underline-offset-2 hover:text-primary/80">Sign up for free</Link> to save your maps and share them.
        </p>
        <DialogFooter>
          <Button size="sm" onClick={dismiss}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
