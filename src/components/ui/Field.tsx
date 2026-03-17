"use client";

import { useId, Children, cloneElement, isValidElement } from "react";
import { Label } from "@/components/ui/label";

export default function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const autoId = useId();

  const enhanced = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const props = child.props as Record<string, unknown>;
    if (props.id || props["aria-label"] || props["aria-labelledby"]) return child;
    return cloneElement(child as React.ReactElement<Record<string, unknown>>, { id: autoId, "aria-label": label });
  });

  return (
    <div className={className}>
      <Label htmlFor={autoId} className="text-xs text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {enhanced}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
