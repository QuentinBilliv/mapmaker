"use client";

import { useMemo } from "react";
import { sanitizeSvg } from "@/lib/svg-sanitizer";

interface SafeSvgProps {
  svg: string;
  className?: string;
  title?: string;
}

export default function SafeSvg({ svg, className, title }: SafeSvgProps) {
  const sanitized = useMemo(() => {
    try {
      return sanitizeSvg(svg);
    } catch {
      return "";
    }
  }, [svg]);

  return (
    <span
      className={className}
      title={title}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
