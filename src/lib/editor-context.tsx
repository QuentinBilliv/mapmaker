"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import { DrawMode } from "./draw-engine";
import { geometryTypeToFeatureType } from "./geojson";
import { DEFAULT_LAYER, DEFAULT_MAP } from "./defaults";
import { BASE_MAPS, type BaseMap } from "./map-style";
import type { MapData, LayerData, FeatureData, PointShape, LineStyle, ArrowStyle, FillPattern } from "./types";

interface EditorState {
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  drawMode: DrawMode;
  activeLabel: string;
  activeSourceText: string;
  activeSourceUrl: string;
  activeColor: string;
  activeOpacity: number;
  activeLayerId: string;
  activeSize: number;
  activeShape: PointShape;
  activeIcon: string | null;
  activeBorderColor: string;
  activeBorderWidth: number;
  activeSmoothing: number;
  activeStrokeWidth: number;
  activeLineStyle: LineStyle;
  activeArrowStyle: ArrowStyle;
  activeFillPattern: FillPattern;
  activeBaseMap: BaseMap;
  selectedFeature: FeatureData | null;
}

interface EditorActions {
  setDrawMode: (mode: DrawMode) => void;
  setActiveLabel: (label: string) => void;
  setActiveSourceText: (text: string) => void;
  setActiveSourceUrl: (url: string) => void;
  setActiveColor: (color: string) => void;
  setActiveOpacity: (opacity: number) => void;
  setActiveLayerId: (id: string) => void;
  setActiveSize: (size: number) => void;
  setActiveShape: (shape: PointShape) => void;
  setActiveIcon: (icon: string | null) => void;
  setActiveBorderColor: (color: string) => void;
  setActiveBorderWidth: (width: number) => void;
  setActiveSmoothing: (smoothing: number) => void;
  setActiveStrokeWidth: (width: number) => void;
  setActiveLineStyle: (style: LineStyle) => void;
  setActiveArrowStyle: (style: ArrowStyle) => void;
  setActiveFillPattern: (pattern: FillPattern) => void;
  selectFeature: (id: string | null) => void;
  addFeature: (geometry: GeoJSON.Geometry) => void;
  updateFeature: (id: string, updates: Partial<FeatureData>) => void;
  deleteFeature: (id: string) => void;
  addLayer: (name: string) => void;
  toggleLayer: (id: string) => void;
  deleteLayer: (id: string) => void;
  setActiveBaseMap: (baseMap: BaseMap) => void;
  updateMap: (updates: Partial<MapData>) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  registerDrawingControls: (controls: { finishDrawing: () => void; cancelDrawing: () => void }) => void;
}

type EditorContextValue = EditorState & EditorActions;

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<MapData>(DEFAULT_MAP);
  const [layers, setLayers] = useState<LayerData[]>([DEFAULT_LAYER]);
  const [features, setFeatures] = useState<FeatureData[]>([]);
  const [drawMode, setDrawMode] = useState<DrawMode>("select");
  const [activeLabel, setActiveLabel] = useState("");
  const [activeSourceText, setActiveSourceText] = useState("");
  const [activeSourceUrl, setActiveSourceUrl] = useState("");
  const [activeColor, setActiveColor] = useState("#1a1a1a");
  const [activeOpacity, setActiveOpacity] = useState(1);
  const [activeLayerId, setActiveLayerId] = useState(DEFAULT_LAYER.id);
  const [activeSize, setActiveSize] = useState(1);
  const [activeShape, setActiveShape] = useState<PointShape>("circle");
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [activeBorderColor, setActiveBorderColor] = useState("#ffffff");
  const [activeBorderWidth, setActiveBorderWidth] = useState(6);
  const [activeSmoothing, setActiveSmoothing] = useState(0);
  const [activeStrokeWidth, setActiveStrokeWidth] = useState(3);
  const [activeLineStyle, setActiveLineStyle] = useState<LineStyle>("solid");
  const [activeArrowStyle, setActiveArrowStyle] = useState<ArrowStyle>("none");
  const [activeFillPattern, setActiveFillPattern] = useState<FillPattern>("none");
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMap>(BASE_MAPS[0]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null
  );

  const selectedFeature = useMemo(
    () => features.find((f) => f.id === selectedFeatureId) ?? null,
    [features, selectedFeatureId]
  );

  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  const addFeature = useCallback(
    (geometry: GeoJSON.Geometry) => {
      const featureType = geometryTypeToFeatureType(geometry.type);
      const isPoint = featureType === "point";
      const isLine = featureType === "polyline";
      const currentMode = drawModeRef.current;
      const arrowFromMode = currentMode === "arrow" ? "forward" : currentMode === "double-arrow" ? "both" : activeArrowStyle;
      const newFeature: FeatureData = {
        id: uuid(),
        layerId: activeLayerId,
        type: featureType,
        label: activeLabel,
        color: activeColor,
        opacity: activeOpacity,
        size: isPoint ? activeSize : undefined,
        shape: isPoint ? (activeIcon ? undefined : activeShape) : undefined,
        icon: isPoint ? (activeIcon ?? undefined) : undefined,
        borderColor: isPoint ? activeBorderColor : undefined,
        borderWidth: isPoint ? activeBorderWidth : undefined,
        smoothing: isPoint ? 0 : activeSmoothing,
        strokeWidth: isPoint ? 0 : activeStrokeWidth,
        lineStyle: isPoint ? "solid" : activeLineStyle,
        arrowStyle: isLine ? arrowFromMode : "none",
        fillPattern: featureType === "polygon" ? activeFillPattern : "none",
        sourceText: activeSourceText,
        sourceUrl: activeSourceUrl || undefined,
        geometry: JSON.stringify(geometry),
      };
      setFeatures((prev) => [...prev, newFeature]);
      setSelectedFeatureId(newFeature.id);
      setDrawMode("select");
      setActiveLabel("");
      setActiveSourceText("");
      setActiveSourceUrl("");
    },
    [activeLabel, activeSourceText, activeSourceUrl, activeLayerId, activeColor, activeOpacity, activeSize, activeShape, activeIcon, activeBorderColor, activeBorderWidth, activeSmoothing, activeStrokeWidth, activeLineStyle, activeArrowStyle, activeFillPattern]
  );

  const updateFeature = useCallback(
    (id: string, updates: Partial<FeatureData>) => {
      setFeatures((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const deleteFeature = useCallback((id: string) => {
    setFeatures((prev) => prev.filter((f) => f.id !== id));
    setSelectedFeatureId(null);
  }, []);

  const addLayer = useCallback((name: string) => {
    const newLayer: LayerData = {
      id: uuid(),
      name,
      visible: true,
      order: 0,
    };
    setLayers((prev) => {
      newLayer.order = prev.length;
      return [...prev, newLayer];
    });
    setActiveLayerId(newLayer.id);
  }, []);

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  const deleteLayer = useCallback((id: string) => {
    setLayers((prev) => {
      const remaining = prev.filter((l) => l.id !== id);
      if (remaining.length === 0) return prev;
      return remaining;
    });
    setFeatures((prev) => prev.filter((f) => f.layerId !== id));
    setActiveLayerId((prev) => {
      if (prev !== id) return prev;
      return DEFAULT_LAYER.id;
    });
  }, []);

  const updateMap = useCallback((updates: Partial<MapData>) => {
    setMap((prev) => ({ ...prev, ...updates }));
  }, []);

  const selectFeature = useCallback((id: string | null) => {
    setSelectedFeatureId(id);
  }, []);

  const drawingControlsRef = useRef<{ finishDrawing: () => void; cancelDrawing: () => void }>({
    finishDrawing: () => {},
    cancelDrawing: () => {},
  });

  const registerDrawingControls = useCallback((controls: { finishDrawing: () => void; cancelDrawing: () => void }) => {
    drawingControlsRef.current = controls;
  }, []);

  const finishDrawing = useCallback(() => drawingControlsRef.current.finishDrawing(), []);
  const cancelDrawing = useCallback(() => drawingControlsRef.current.cancelDrawing(), []);

  const value = useMemo<EditorContextValue>(
    () => ({
      map,
      layers,
      features,
      drawMode,
      activeLabel,
      activeSourceText,
      activeSourceUrl,
      activeColor,
      activeOpacity,
      activeLayerId,
      activeSize,
      activeShape,
      activeIcon,
      activeBorderColor,
      activeBorderWidth,
      activeSmoothing,
      activeStrokeWidth,
      activeLineStyle,
      activeArrowStyle,
      activeFillPattern,
      activeBaseMap,
      selectedFeature,
      setDrawMode,
      setActiveLabel,
      setActiveSourceText,
      setActiveSourceUrl,
      setActiveColor,
      setActiveOpacity,
      setActiveLayerId,
      setActiveSize,
      setActiveShape,
      setActiveIcon,
      setActiveBorderColor,
      setActiveBorderWidth,
      setActiveSmoothing,
      setActiveStrokeWidth,
      setActiveLineStyle,
      setActiveArrowStyle,
      setActiveFillPattern,
      selectFeature,
      addFeature,
      updateFeature,
      deleteFeature,
      addLayer,
      toggleLayer,
      deleteLayer,
      setActiveBaseMap,
      updateMap,
      finishDrawing,
      cancelDrawing,
      registerDrawingControls,
    }),
    [
      map,
      layers,
      features,
      drawMode,
      activeLabel,
      activeSourceText,
      activeSourceUrl,
      activeColor,
      activeOpacity,
      activeLayerId,
      activeSize,
      activeShape,
      activeIcon,
      activeBorderColor,
      activeBorderWidth,
      activeSmoothing,
      activeStrokeWidth,
      activeLineStyle,
      activeArrowStyle,
      activeFillPattern,
      activeBaseMap,
      selectedFeature,
      selectFeature,
      addFeature,
      updateFeature,
      deleteFeature,
      addLayer,
      toggleLayer,
      deleteLayer,
      setActiveBaseMap,
      updateMap,
      finishDrawing,
      cancelDrawing,
      registerDrawingControls,
    ]
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}
