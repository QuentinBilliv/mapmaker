export interface MapData {
  id: string;
  title: string;
  description: string;
  tags: string[];
  license: string;
  center: [number, number];
  zoom: number;
}

export interface LayerData {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

export type PointShape = "circle" | "triangle" | "square" | "diamond" | "star" | "cross";

export const POINT_SHAPES: { value: PointShape; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "triangle", label: "Triangle" },
  { value: "square", label: "Square" },
  { value: "diamond", label: "Diamond" },
  { value: "star", label: "Star" },
  { value: "cross", label: "Cross" },
];

export type LineStyle = "solid" | "dotted" | "dash-short" | "dash-medium" | "dash-long";
export type ArrowStyle = "none" | "forward" | "both";

export const LINE_STYLES: { value: LineStyle; label: string; dash?: number[] }[] = [
  { value: "solid", label: "Solid ────" },
  { value: "dotted", label: "Dotted ·······" },
  { value: "dash-short", label: "Short - - - -" },
  { value: "dash-medium", label: "Medium — — —" },
  { value: "dash-long", label: "Long ——  ——" },
];

export const ARROW_STYLES: { value: ArrowStyle; label: string }[] = [
  { value: "none", label: "None" },
  { value: "forward", label: "Arrow →" },
  { value: "both", label: "Arrow ↔" },
];

export interface FeatureData {
  id: string;
  layerId: string;
  type: "polygon" | "polyline" | "point";
  label: string;
  color: string;
  opacity: number;
  size?: number;
  shape?: PointShape;
  icon?: string;
  customSvg?: string;
  smoothing: number;
  strokeWidth: number;
  lineStyle: LineStyle;
  arrowStyle: ArrowStyle;
  sourceText: string;
  sourceUrl?: string;
  geometry: string;
}
