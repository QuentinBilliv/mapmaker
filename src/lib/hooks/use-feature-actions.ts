import { useCallback } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import difference from "@turf/difference";
import { featureCollection, feature as turfFeature } from "@turf/helpers";
import type { DrawMode } from "../draw-engine";
import { geometryTypeToFeatureType } from "../geojson";
import { COLORS, DEFAULT_BORDER_WIDTH } from "../defaults";
import { nextOrder, shiftGeometry } from "../geometry-transforms";
import type { FeatureData, FeatureUpdate, PolygonFeature } from "../types";
import type { DrawingState } from "../drawing-state";

const DUPLICATE_OFFSET_LNG = 0.005;
const DUPLICATE_OFFSET_MERC_Y = 0.005;

function geometryCentroid(geom: GeoJSON.Geometry): [number, number] {
  if (geom.type === "Point") return geom.coordinates as [number, number];
  const coords: number[][] = [];
  if (geom.type === "LineString") coords.push(...geom.coordinates);
  else if (geom.type === "Polygon") geom.coordinates.forEach((r) => coords.push(...r));
  else if (geom.type === "MultiPoint") coords.push(...geom.coordinates);
  else if (geom.type === "MultiLineString") geom.coordinates.forEach((l) => coords.push(...l));
  else if (geom.type === "MultiPolygon") geom.coordinates.forEach((p) => p.forEach((r) => coords.push(...r)));
  if (coords.length === 0) return [0, 0];
  let x = 0, y = 0;
  for (const c of coords) { x += c[0]; y += c[1]; }
  return [x / coords.length, y / coords.length];
}

interface Deps {
  featuresRef: React.RefObject<FeatureData[]>;
  drawingRef: React.RefObject<DrawingState>;
  drawModeRef: React.RefObject<DrawMode>;
  setFeatures: React.Dispatch<React.SetStateAction<FeatureData[]>>;
  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>;
  dispatchDrawing: React.Dispatch<{ type: "RESET_AFTER_ADD"; isText: boolean }>;
  recordSnapshot: () => void;
  featureLimit: number;
  onFeatureAdded?: (newCount: number) => void;
}

export function useFeatureActions({
  featuresRef, drawingRef, drawModeRef,
  setFeatures, setSelectedFeatureIds, dispatchDrawing,
  recordSnapshot, featureLimit, onFeatureAdded,
}: Deps) {
  const selectFeature = useCallback((id: string | null) => {
    setSelectedFeatureIds(id ? [id] : []);
  }, [setSelectedFeatureIds]);

  const selectFeatures = useCallback((ids: string[]) => {
    setSelectedFeatureIds(ids);
  }, [setSelectedFeatureIds]);

  const addFeature = useCallback((geometry: GeoJSON.Geometry) => {
    if (featureLimit !== Infinity && featuresRef.current!.length >= featureLimit) return;
    recordSnapshot();
    const s = drawingRef.current!;
    const currentMode = drawModeRef.current!;
    const isText = currentMode === "text";
    const featureType = isText ? "text" as const : geometryTypeToFeatureType(geometry.type);
    const order = nextOrder(featuresRef.current!);
    const base = {
      id: uuid(),
      label: s.activeLabel,
      description: "",
      color: s.activeColor,
      opacity: s.activeOpacity,
      order,
      geometry,
    };
    let newFeature: FeatureData;
    switch (featureType) {
      case "text":
        newFeature = {
          ...base, type: "text",
          textContent: s.activeText.textContent || "Text",
          fontSize: s.activeText.fontSize,
          fontFamily: s.activeText.fontFamily,
          textBorderEnabled: s.activeText.textBorderEnabled,
          textBorderColor: s.activeText.textBorderColor,
          textBorderWidth: s.activeText.textBorderWidth,
        };
        break;
      case "point":
        newFeature = {
          ...base, type: "point",
          size: s.activePoint.size,
          shape: s.activePoint.customSvg ? undefined : s.activePoint.shape,
          customSvg: s.activePoint.customSvg ?? undefined,
          borderColor: s.activePoint.borderColor,
          borderWidth: s.activePoint.borderWidth,
        };
        break;
      case "polyline":
        newFeature = {
          ...base, type: "polyline",
          smoothing: s.activeStroke.smoothing,
          strokeWidth: s.activeStroke.strokeWidth,
          lineStyle: s.activeStroke.lineStyle,
          arrowStyle: currentMode === "arrow" ? "forward" : currentMode === "double-arrow" ? "both" : s.activeStroke.arrowStyle,
          lineDecoration: s.activeStroke.lineDecoration,
          decorationSpacing: s.activeStroke.decorationSpacing,
        };
        break;
      case "polygon":
        newFeature = {
          ...base, type: "polygon",
          shapeOrigin: currentMode === "rectangle" ? "rectangle" : currentMode === "circle" ? "circle" : undefined,
          smoothing: s.activeStroke.smoothing,
          strokeWidth: s.activeStroke.strokeWidth,
          lineStyle: s.activeStroke.lineStyle,
          lineDecoration: s.activeStroke.lineDecoration,
          decorationSpacing: s.activeStroke.decorationSpacing,
          fillPattern: s.activeStroke.fillPattern,
        };
        break;
    }
    setFeatures((prev) => [...prev, newFeature]);
    setSelectedFeatureIds([newFeature.id]);
    dispatchDrawing({ type: "RESET_AFTER_ADD", isText });
    onFeatureAdded?.(featuresRef.current!.length + 1);
  }, [featuresRef, drawingRef, drawModeRef, setFeatures, setSelectedFeatureIds, dispatchDrawing, recordSnapshot, featureLimit, onFeatureAdded]);

  const addBankFeature = useCallback((geometry: GeoJSON.Geometry, label: string) => {
    if (featureLimit !== Infinity && featuresRef.current!.length >= featureLimit) return;
    recordSnapshot();
    const s = drawingRef.current!;
    const featureType = geometryTypeToFeatureType(geometry.type);
    const order = nextOrder(featuresRef.current!);
    const base = {
      id: uuid(),
      label,
      description: "",
      color: s.activeColor,
      opacity: s.activeOpacity,
      order,
      geometry,
    };
    let newFeature: FeatureData;
    switch (featureType) {
      case "polygon":
        newFeature = { ...base, type: "polygon", smoothing: 0, strokeWidth: 3, lineStyle: "solid", lineDecoration: "none", decorationSpacing: 50, fillPattern: "none" };
        break;
      case "polyline":
        newFeature = { ...base, type: "polyline", smoothing: 0, strokeWidth: 3, lineStyle: "solid", arrowStyle: "none", lineDecoration: "none", decorationSpacing: 50 };
        break;
      case "point":
        newFeature = { ...base, type: "point", size: 1, shape: "circle", borderColor: COLORS.white, borderWidth: DEFAULT_BORDER_WIDTH };
        break;
      default:
        return;
    }
    setFeatures((prev) => [...prev, newFeature]);
    setSelectedFeatureIds([newFeature.id]);
    onFeatureAdded?.(featuresRef.current!.length + 1);
  }, [featuresRef, drawingRef, setFeatures, setSelectedFeatureIds, recordSnapshot, featureLimit, onFeatureAdded]);

  const updateFeature = useCallback(
    (id: string, updates: FeatureUpdate) => {
      setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } as FeatureData : f)));
    },
    [setFeatures]
  );

  const duplicateFeature = useCallback((id: string) => {
    if (featureLimit !== Infinity && featuresRef.current!.length >= featureLimit) return;
    recordSnapshot();
    const source = featuresRef.current!.find((f) => f.id === id);
    if (!source) return;
    const clone = {
      ...structuredClone(source),
      id: uuid(),
      order: nextOrder(featuresRef.current!),
      geometry: shiftGeometry(source.geometry, DUPLICATE_OFFSET_LNG, DUPLICATE_OFFSET_MERC_Y),
    } as FeatureData;
    setFeatures((prev) => [...prev, clone]);
    setSelectedFeatureIds([clone.id]);
    onFeatureAdded?.(featuresRef.current!.length + 1);
  }, [featuresRef, setFeatures, setSelectedFeatureIds, recordSnapshot, featureLimit, onFeatureAdded]);

  const addLabelToFeature = useCallback((id: string) => {
    if (featureLimit !== Infinity && featuresRef.current!.length >= featureLimit) return;
    recordSnapshot();
    const source = featuresRef.current!.find((f) => f.id === id);
    if (!source || source.type === "text") return;
    const center = geometryCentroid(source.geometry);
    const labelFeature: FeatureData = {
      id: uuid(),
      label: `${source.label || "Untitled"} label`,
      description: "",
      color: source.color,
      opacity: 1,
      order: nextOrder(featuresRef.current!),
      geometry: { type: "Point", coordinates: center },
      type: "text",
      textContent: source.label || "Untitled",
      fontSize: 16,
      fontFamily: "sans",
      textBorderEnabled: true,
      textBorderColor: COLORS.white,
      textBorderWidth: 2,
    };
    setFeatures((prev) => [...prev, labelFeature]);
    setSelectedFeatureIds([labelFeature.id]);
    onFeatureAdded?.(featuresRef.current!.length + 1);
  }, [featuresRef, setFeatures, setSelectedFeatureIds, recordSnapshot, featureLimit, onFeatureAdded]);

  const deleteFeature = useCallback((id: string) => {
    recordSnapshot();
    setFeatures((prev) => prev.filter((f) => f.id !== id));
    setSelectedFeatureIds([]);
  }, [setFeatures, setSelectedFeatureIds, recordSnapshot]);

  const subtractPolygons = useCallback((targetId: string, subtractorId: string) => {
    const target = featuresRef.current!.find((f) => f.id === targetId) as PolygonFeature | undefined;
    const subtractor = featuresRef.current!.find((f) => f.id === subtractorId) as PolygonFeature | undefined;
    if (!target || !subtractor || target.type !== "polygon" || subtractor.type !== "polygon") {
      toast.error("Subtract requires two polygons");
      return;
    }
    if (target.geometry.type !== "Polygon" && target.geometry.type !== "MultiPolygon") return;
    if (subtractor.geometry.type !== "Polygon" && subtractor.geometry.type !== "MultiPolygon") return;
    const fc = featureCollection([
      turfFeature(target.geometry),
      turfFeature(subtractor.geometry),
    ]);
    const result = difference(fc);
    if (!result) {
      toast.error("Subtractor covers the target entirely");
      return;
    }
    recordSnapshot();
    setFeatures((prev) =>
      prev
        .filter((f) => f.id !== subtractorId)
        .map((f) =>
          f.id === targetId
            ? ({ ...f, geometry: result.geometry, shapeOrigin: undefined } as FeatureData)
            : f
        )
    );
    setSelectedFeatureIds([targetId]);
  }, [featuresRef, setFeatures, setSelectedFeatureIds, recordSnapshot]);

  const clearAllFeatures = useCallback(() => {
    recordSnapshot();
    setFeatures([]);
    setSelectedFeatureIds([]);
  }, [setFeatures, setSelectedFeatureIds, recordSnapshot]);

  const reorderFeatures = useCallback((orderedIds: string[]) => {
    recordSnapshot();
    setFeatures((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      return orderedIds
        .map((id, i) => {
          const f = map.get(id);
          return f ? { ...f, order: i } as FeatureData : null;
        })
        .filter((f): f is FeatureData => f !== null);
    });
  }, [setFeatures, recordSnapshot]);

  return {
    selectFeature, selectFeatures,
    addFeature, addBankFeature, updateFeature,
    duplicateFeature, addLabelToFeature, deleteFeature,
    subtractPolygons,
    clearAllFeatures, reorderFeatures,
  };
}
