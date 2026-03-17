import maplibregl from "maplibre-gl";

export const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export function setOverlayData(
  map: maplibregl.Map,
  sourceId: string,
  data: GeoJSON.FeatureCollection,
) {
  const s = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
  if (s) s.setData(data);
}

export function beginDrag(map: maplibregl.Map, e: maplibregl.MapMouseEvent, interactingRef: React.MutableRefObject<boolean>) {
  e.preventDefault();
  interactingRef.current = true;
  map.dragPan.disable();
  map.getCanvas().style.cursor = "grabbing";
}

export function endDrag(map: maplibregl.Map, interactingRef: React.MutableRefObject<boolean>) {
  map.dragPan.enable();
  map.getCanvas().style.cursor = "";
  setTimeout(() => { interactingRef.current = false; }, 0);
}
