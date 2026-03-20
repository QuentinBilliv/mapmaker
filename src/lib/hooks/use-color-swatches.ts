import { useMemo } from "react";
import type { FeatureData } from "../types";

const MAX_SWATCHES = 12;

export function useColorSwatches(features: FeatureData[]): string[] {
  return useMemo(() => {
    const seen = new Set<string>();
    const colors: string[] = [];
    for (let i = features.length - 1; i >= 0; i--) {
      const c = features[i].color.toLowerCase();
      if (!seen.has(c)) {
        seen.add(c);
        colors.push(features[i].color);
      }
      if (colors.length >= MAX_SWATCHES) break;
    }
    return colors;
  }, [features]);
}
