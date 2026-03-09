"use client";

import { Button } from "@/components/ui/button";

export default function PanelHeader({
  title,
  onClose,
  action,
}: {
  title: string;
  onClose?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {action}
      {onClose && (
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          ✕
        </Button>
      )}
    </div>
  );
}
