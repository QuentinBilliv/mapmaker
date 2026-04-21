"use client";

import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

export default function HelpTip({ text, className }: { text: ReactNode; className?: string }) {
  return (
    <Tooltip.Provider delay={0} closeDelay={0}>
      <Tooltip.Root>
        <Tooltip.Trigger
          type="button"
          tabIndex={-1}
          aria-label="Help"
          className={cn(
            "inline-flex size-3.5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            className
          )}
        >
          <HelpCircle className="size-full" aria-hidden />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={6} className="z-50">
            <Tooltip.Popup className="max-w-xs rounded-md border bg-popover px-2.5 py-1.5 text-xs leading-relaxed text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
              {text}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
