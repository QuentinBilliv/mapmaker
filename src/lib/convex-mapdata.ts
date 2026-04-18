import type { MapData } from "./types";

export function toMapData(doc: {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  license: string;
  center: number[];
  zoom: number;
  zoomLocked?: boolean;
  panLocked?: boolean;
}): MapData {
  return {
    id: doc._id,
    title: doc.title,
    description: doc.description,
    tags: doc.tags,
    license: doc.license,
    center: doc.center as [number, number],
    zoom: doc.zoom,
    zoomLocked: doc.zoomLocked,
    panLocked: doc.panLocked,
  };
}
