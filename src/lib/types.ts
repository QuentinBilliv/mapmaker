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
  sourceText: string;
  sourceUrl?: string;
  geometry: string;
}
