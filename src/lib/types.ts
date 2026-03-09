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

export interface FeatureData {
  id: string;
  layerId: string;
  type: "polygon" | "polyline" | "point";
  label: string;
  color: string;
  opacity: number;
  sourceText: string;
  sourceUrl?: string;
  geometry: string; // JSON stringified GeoJSON geometry
}
