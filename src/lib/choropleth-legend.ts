import type { ChoroplethData, ChoroplethCategory } from "@/lib/types";

interface ChoroplethGradientInfo {
  colors: [string, string];
  label: string;
  min: number;
  max: number;
}

export function choroplethLegendProps(choropleth: ChoroplethData): {
  choroplethCategories: ChoroplethCategory[];
  choroplethGradient?: ChoroplethGradientInfo;
} {
  const choroplethCategories =
    choropleth.enabled && choropleth.mode === "discrete" ? choropleth.categories : [];
  const gradientNums = Object.values(choropleth.values ?? {});
  const choroplethGradient =
    choropleth.enabled && choropleth.mode === "gradient" && gradientNums.length > 0
      ? {
          colors: (choropleth.gradientColors ?? ["#22c55e", "#3b82f6"]) as [string, string],
          label: choropleth.gradientLabel ?? "",
          min: Math.min(...gradientNums),
          max: Math.max(...gradientNums),
        }
      : undefined;
  return { choroplethCategories, choroplethGradient };
}
