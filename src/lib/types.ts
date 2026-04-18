export interface MapData {
  id: string;
  title: string;
  description: string;
  tags: string[];
  license: string;
  center: [number, number];
  zoom: number;
  interactionLocked?: boolean;
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
  { value: "sans", label: "Sans-serif", stack: ["Noto Sans Regular", "Arial Unicode MS Regular"] },
  { value: "serif", label: "Serif", stack: ["Noto Sans Regular", "Arial Unicode MS Regular"] },
  { value: "mono", label: "Monospace", stack: ["Noto Sans Regular", "Arial Unicode MS Regular"] },
];

export interface ChoroplethCategory {
  id: string;
  color: string;
  label: string;
  order: number;
}

export type ChoroplethMode = "discrete" | "gradient";

export type TileLayerId = "countries" | "us-states" | "canada-provinces" | "france-departements" | "eu-nuts2" | "china-provinces" | "india-states" | "russia-regions";

export interface ChoroplethData {
  enabled: boolean;
  tileLayer: TileLayerId;
  mode: ChoroplethMode;
  categories: ChoroplethCategory[];
  assignments: Record<string, string>;
  gradientColors: [string, string];
  gradientLabel: string;
  values: Record<string, number>;
  opacity: number;
  activeCategoryId: string | null;
}

export const DEFAULT_CHOROPLETH: ChoroplethData = {
  enabled: false,
  tileLayer: "countries",
  mode: "discrete",
  categories: [],
  assignments: {},
  gradientColors: ["#22c55e", "#3b82f6"],
  gradientLabel: "",
  values: {},
  opacity: 0.7,
  activeCategoryId: null,
};

export interface GroupData {
  id: string;
  label: string;
  order: number;
}

export type LegendFeatureType = "point" | "polyline" | "polygon" | "text";

interface LegendEntryBase {
  id: string;
  label: string;
  order: number;
  color: string;
  opacity: number;
}

export interface PointLegendEntry extends LegendEntryBase {
  featureType: "point";
  size: number;
  shape?: PointShape;
  customSvg?: string;
  borderColor: string;
  borderWidth: number;
}

export interface PolylineLegendEntry extends LegendEntryBase {
  featureType: "polyline";
  smoothing: number;
  strokeWidth: number;
  lineStyle: LineStyle;
  arrowStyle: ArrowStyle;
  lineDecoration: LineDecoration;
  decorationSpacing: number;
}

export interface PolygonLegendEntry extends LegendEntryBase {
  featureType: "polygon";
  smoothing: number;
  strokeWidth: number;
  lineStyle: LineStyle;
  lineDecoration: LineDecoration;
  decorationSpacing: number;
  fillPattern: FillPattern;
}

export interface TextLegendEntry extends LegendEntryBase {
  featureType: "text";
  fontSize: number;
  fontFamily: TextFont;
  bold?: boolean;
  italic?: boolean;
  textBorderEnabled: boolean;
  textBorderColor: string;
  textBorderWidth: number;
}

export type LegendEntry = PointLegendEntry | PolylineLegendEntry | PolygonLegendEntry | TextLegendEntry;
export type NewLegendEntry = Omit<PointLegendEntry, "id" | "order"> | Omit<PolylineLegendEntry, "id" | "order"> | Omit<PolygonLegendEntry, "id" | "order"> | Omit<TextLegendEntry, "id" | "order">;

interface FeatureBase {
  id: string;
  label: string;
  description: string;
  color: string;
  opacity: number;
  order: number;
  rotation?: number;
  groupId?: string;
  legendEntryId?: string;
  choroplethCategoryId?: string;
  geometry: GeoJSON.Geometry;
}

interface StrokeFields {
  smoothing: number;
  strokeWidth: number;
  lineStyle: LineStyle;
  lineDecoration: LineDecoration;
  decorationSpacing: number;
}

export interface PolygonFeature extends FeatureBase, StrokeFields {
  type: "polygon";
  shapeOrigin?: ShapeOrigin;
  fillPattern: FillPattern;
}

export interface PolylineFeature extends FeatureBase, StrokeFields {
  type: "polyline";
  arrowStyle: ArrowStyle;
}

export interface PointFeature extends FeatureBase {
  type: "point";
  size: number;
  shape?: PointShape;
  customSvg?: string;
  borderColor: string;
  borderWidth: number;
}

export interface TextFeature extends FeatureBase {
  type: "text";
  textContent: string;
  fontSize: number;
  fontFamily: TextFont;
  bold?: boolean;
  italic?: boolean;
  textBorderEnabled: boolean;
  textBorderColor: string;
  textBorderWidth: number;
}

export type FeatureData = PolygonFeature | PolylineFeature | PointFeature | TextFeature;

export type FeatureUpdate = Partial<
  Omit<FeatureBase, "id"> &
  StrokeFields &
  Omit<PolygonFeature, keyof FeatureBase | keyof StrokeFields | "type"> &
  Omit<PolylineFeature, keyof FeatureBase | keyof StrokeFields | "type"> &
  Omit<PointFeature, keyof FeatureBase | "type"> &
  Omit<TextFeature, keyof FeatureBase | "type">
>;
