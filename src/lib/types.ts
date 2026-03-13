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

export type PointShape = "circle" | "triangle" | "square" | "diamond" | "star" | "cross" | "pentagon" | "hexagon";

export const POINT_SHAPES: { value: PointShape; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "triangle", label: "Triangle" },
  { value: "square", label: "Square" },
  { value: "diamond", label: "Diamond" },
  { value: "pentagon", label: "Pentagon" },
  { value: "hexagon", label: "Hexagon" },
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

export type LineDecoration = "none" | "crosses" | "crosses-free" | "ticks" | "triangles-up" | "triangles-down" | "arrows-down" | "arrows-up" | "railway";

export const LINE_DECORATIONS: { value: LineDecoration; label: string }[] = [
  { value: "none", label: "None" },
  { value: "crosses", label: "Crosses ×─×" },
  { value: "crosses-free", label: "Crosses × ×" },
  { value: "ticks", label: "Ticks ┼┼┼" },
  { value: "triangles-up", label: "Triangles △△" },
  { value: "triangles-down", label: "Triangles ▽▽" },
  { value: "arrows-down", label: "Arrows ↓↓" },
  { value: "arrows-up", label: "Arrows ↑↑" },
  { value: "railway", label: "Railway ╫╫" },
];

export type FillPattern = "none" | "stripes-diagonal" | "stripes-horizontal" | "stripes-vertical" | "crosshatch" | "dots";

export const FILL_PATTERNS: { value: FillPattern; label: string }[] = [
  { value: "none", label: "Solid" },
  { value: "stripes-diagonal", label: "Diagonal" },
  { value: "stripes-horizontal", label: "Horizontal" },
  { value: "stripes-vertical", label: "Vertical" },
  { value: "crosshatch", label: "Crosshatch" },
  { value: "dots", label: "Dots" },
];

export type ShapeOrigin = "rectangle" | "circle";

export type TextFont = "sans" | "serif" | "mono";

export const TEXT_FONTS: { value: TextFont; label: string; stack: string[] }[] = [
  { value: "sans", label: "Sans-serif", stack: ["Open Sans Regular", "Arial Unicode MS Regular"] },
  { value: "serif", label: "Serif", stack: ["Open Sans Regular", "Arial Unicode MS Regular"] },
  { value: "mono", label: "Monospace", stack: ["Open Sans Regular", "Arial Unicode MS Regular"] },
];

export interface FeatureData {
  id: string;
  layerId: string;
  type: "polygon" | "polyline" | "point" | "text";
  shapeOrigin?: ShapeOrigin;
  label: string;
  color: string;
  opacity: number;
  size?: number;
  shape?: PointShape;
  icon?: string;
  customSvg?: string;
  borderColor?: string;
  borderWidth?: number;
  smoothing: number;
  strokeWidth: number;
  lineStyle: LineStyle;
  arrowStyle: ArrowStyle;
  lineDecoration: LineDecoration;
  decorationSpacing: number;
  fillPattern: FillPattern;
  textContent?: string;
  fontSize?: number;
  fontFamily?: TextFont;
  textBorderEnabled?: boolean;
  textBorderColor?: string;
  textBorderWidth?: number;
  sourceText: string;
  sourceUrl?: string;
  geometry: GeoJSON.Geometry;
}
