"use client";

import { useState, type ComponentType } from "react";
import { HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type HelpExplanation = {
  title: string;
  summary: string;
  Dialog: ComponentType;
};

type HelpHintProps = {
  help: HelpExplanation;
  className?: string;
};

export default function HelpHint({ help, className }: HelpHintProps) {
  const [open, setOpen] = useState(false);
  const DialogBody = help.Dialog;

  return (
    <>
      <button
        type="button"
        aria-label={help.title}
        title={help.title}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          className
        )}
      >
        <HelpCircle className="size-full" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose
            className="absolute right-3 top-3 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>{help.title}</DialogTitle>
          </DialogHeader>
          <p className="mt-3 text-sm font-medium text-foreground">{help.summary}</p>
          <div className="mt-3 text-sm text-muted-foreground">
            <DialogBody />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
