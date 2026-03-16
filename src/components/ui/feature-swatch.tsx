"use client";

import { useRef, useEffect } from "react";
import type { FeatureData } from "@/lib/types";
import { drawShape } from "@/lib/legend-canvas";

const PR = 2;

export function FeatureSwatch({
  feature,
  width = 56,
  height = 32,
}: {
  feature: FeatureData;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawShape(ctx, feature, canvas.width, canvas.height).then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [feature]);

  return (
    <canvas
      ref={ref}
      width={width * PR}
      height={height * PR}
      className="shrink-0"
      style={{ width, height }}
    />
  );
}
