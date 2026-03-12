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
import type { DrawMode } from "./draw-engine";
import { geometryTypeToFeatureType } from "./geojson";
import { DEFAULT_LAYER, DEFAULT_MAP, COLORS, DEFAULT_BORDER_WIDTH } from "./defaults";
import { BASE_MAPS, type BaseMap } from "./map-style";
import type {
  MapData,
  LayerData,
  FeatureData,
  PointShape,
  LineStyle,
  ArrowStyle,
  LineDecoration,
  FillPattern,
} from "./types";
import type { DeserializedMap } from "./mapmaker-format";

interface EditorDataState {
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  selectedFeature: FeatureData | null;
}

interface DrawingState {
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
  activeLineDecoration: LineDecoration;
  activeDecorationSpacing: number;
  activeFillPattern: FillPattern;
  activeBaseMap: BaseMap;
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
  setActiveLineDecoration: (decoration: LineDecoration) => void;
  setActiveDecorationSpacing: (spacing: number) => void;
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
  importMapData: (data: DeserializedMap) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  registerDrawingControls: (controls: {
    finishDrawing: () => void;
    cancelDrawing: () => void;
  }) => void;
}

const DataContext = createContext<EditorDataState | null>(null);
const DrawingCtx = createContext<DrawingState | null>(null);
const ActionsCtx = createContext<EditorActions | null>(null);

export function useEditorData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useEditorData must be used within EditorProvider");
  return ctx;
}

export function useDrawingState() {
  const ctx = useContext(DrawingCtx);
  if (!ctx)
    throw new Error("useDrawingState must be used within EditorProvider");
  return ctx;
}

export function useEditorActions() {
  const ctx = useContext(ActionsCtx);
  if (!ctx)
    throw new Error("useEditorActions must be used within EditorProvider");
  return ctx;
}

export function useEditor() {
  return { ...useEditorData(), ...useDrawingState(), ...useEditorActions() };
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<MapData>(DEFAULT_MAP);
  const [layers, setLayers] = useState<LayerData[]>([DEFAULT_LAYER]);
  const [features, setFeatures] = useState<FeatureData[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null
  );

  const [drawMode, setDrawMode] = useState<DrawMode>("select");
  const [activeLabel, setActiveLabel] = useState("");
  const [activeSourceText, setActiveSourceText] = useState("");
  const [activeSourceUrl, setActiveSourceUrl] = useState("");
  const [activeColor, setActiveColor] = useState(COLORS.primary);
  const [activeOpacity, setActiveOpacity] = useState(1);
  const [activeLayerId, setActiveLayerId] = useState(DEFAULT_LAYER.id);
  const [activeSize, setActiveSize] = useState(1);
  const [activeShape, setActiveShape] = useState<PointShape>("circle");
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [activeBorderColor, setActiveBorderColor] = useState(COLORS.white);
  const [activeBorderWidth, setActiveBorderWidth] = useState(DEFAULT_BORDER_WIDTH);
  const [activeSmoothing, setActiveSmoothing] = useState(0);
  const [activeStrokeWidth, setActiveStrokeWidth] = useState(3);
  const [activeLineStyle, setActiveLineStyle] = useState<LineStyle>("solid");
  const [activeArrowStyle, setActiveArrowStyle] = useState<ArrowStyle>("none");
  const [activeLineDecoration, setActiveLineDecoration] = useState<LineDecoration>("none");
  const [activeDecorationSpacing, setActiveDecorationSpacing] = useState(50);
  const [activeFillPattern, setActiveFillPattern] =
    useState<FillPattern>("none");
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMap>(BASE_MAPS[0]);

  const selectedFeature = useMemo(
    () => features.find((f) => f.id === selectedFeatureId) ?? null,
    [features, selectedFeatureId]
  );

  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  const drawingRef = useRef({
    activeLabel,
    activeSourceText,
    activeSourceUrl,
    activeLayerId,
    activeColor,
    activeOpacity,
    activeSize,
    activeShape,
    activeIcon,
    activeBorderColor,
    activeBorderWidth,
    activeSmoothing,
    activeStrokeWidth,
    activeLineStyle,
    activeArrowStyle,
    activeLineDecoration,
    activeDecorationSpacing,
    activeFillPattern,
  });
  drawingRef.current = {
    activeLabel,
    activeSourceText,
    activeSourceUrl,
    activeLayerId,
    activeColor,
    activeOpacity,
    activeSize,
    activeShape,
    activeIcon,
    activeBorderColor,
    activeBorderWidth,
    activeSmoothing,
    activeStrokeWidth,
    activeLineStyle,
    activeArrowStyle,
    activeLineDecoration,
    activeDecorationSpacing,
    activeFillPattern,
  };

  const drawingControlsRef = useRef<{
    finishDrawing: () => void;
    cancelDrawing: () => void;
  }>({
    finishDrawing: () => {},
    cancelDrawing: () => {},
  });

  const addFeature = useCallback((geometry: GeoJSON.Geometry) => {
    const s = drawingRef.current;
    const featureType = geometryTypeToFeatureType(geometry.type);
    const isPoint = featureType === "point";
    const isLine = featureType === "polyline";
    const currentMode = drawModeRef.current;
    const arrowFromMode =
      currentMode === "arrow"
        ? "forward"
        : currentMode === "double-arrow"
          ? "both"
          : s.activeArrowStyle;
    const shapeOrigin =
      currentMode === "rectangle" ? "rectangle" as const
      : currentMode === "circle" ? "circle" as const
      : undefined;
    const newFeature: FeatureData = {
      id: uuid(),
      layerId: s.activeLayerId,
      type: featureType,
      shapeOrigin,
      label: s.activeLabel,
      color: s.activeColor,
      opacity: s.activeOpacity,
      size: isPoint ? s.activeSize : undefined,
      shape: isPoint
        ? s.activeIcon
          ? undefined
          : s.activeShape
        : undefined,
      icon: isPoint ? (s.activeIcon ?? undefined) : undefined,
      borderColor: isPoint ? s.activeBorderColor : undefined,
      borderWidth: isPoint ? s.activeBorderWidth : undefined,
      smoothing: isPoint ? 0 : s.activeSmoothing,
      strokeWidth: isPoint ? 0 : s.activeStrokeWidth,
      lineStyle: isPoint ? "solid" : s.activeLineStyle,
      arrowStyle: isLine ? arrowFromMode : "none",
      lineDecoration: isPoint ? "none" : s.activeLineDecoration,
      decorationSpacing: isPoint ? 50 : s.activeDecorationSpacing,
      fillPattern: featureType === "polygon" ? s.activeFillPattern : "none",
      sourceText: s.activeSourceText,
      sourceUrl: s.activeSourceUrl || undefined,
      geometry,
    };
    setFeatures((prev) => [...prev, newFeature]);
    setSelectedFeatureId(newFeature.id);
    setDrawMode("select");
    setActiveLabel("");
    setActiveSourceText("");
    setActiveSourceUrl("");
  }, []);

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
    const id = uuid();
    setLayers((prev) => [...prev, { id, name, visible: true, order: prev.length }]);
    setActiveLayerId(id);
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
    setActiveLayerId((prev) => (prev !== id ? prev : DEFAULT_LAYER.id));
  }, []);

  const updateMap = useCallback((updates: Partial<MapData>) => {
    setMap((prev) => ({ ...prev, ...updates }));
  }, []);

  const importMapData = useCallback((data: DeserializedMap) => {
    setMap((prev) => ({ ...prev, ...data.map }));
    setLayers(data.layers);
    setFeatures(
      data.features.map((f) => ({ ...f, id: uuid() }))
    );
    setActiveLayerId(data.layers[0]?.id ?? DEFAULT_LAYER.id);
    setSelectedFeatureId(null);
    const bm = BASE_MAPS.find((b) => b.id === data.baseMapId);
    if (bm) setActiveBaseMap(bm);
  }, []);

  const selectFeature = useCallback((id: string | null) => {
    setSelectedFeatureId(id);
  }, []);

  const registerDrawingControls = useCallback(
    (controls: { finishDrawing: () => void; cancelDrawing: () => void }) => {
      drawingControlsRef.current = controls;
    },
    []
  );

  const finishDrawing = useCallback(
    () => drawingControlsRef.current.finishDrawing(),
    []
  );
  const cancelDrawing = useCallback(
    () => drawingControlsRef.current.cancelDrawing(),
    []
  );

  const dataValue = useMemo<EditorDataState>(
    () => ({ map, layers, features, selectedFeature }),
    [map, layers, features, selectedFeature]
  );

  const drawingValue = useMemo<DrawingState>(
    () => ({
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
      activeLineDecoration,
      activeDecorationSpacing,
      activeFillPattern,
      activeBaseMap,
    }),
    [
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
      activeLineDecoration,
      activeFillPattern,
      activeBaseMap,
    ]
  );

  const actionsValue = useMemo<EditorActions>(
    () => ({
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
      setActiveLineDecoration,
      setActiveDecorationSpacing,
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
      importMapData,
      finishDrawing,
      cancelDrawing,
      registerDrawingControls,
    }),
    [
      selectFeature,
      addFeature,
      updateFeature,
      deleteFeature,
      addLayer,
      toggleLayer,
      deleteLayer,
      updateMap,
      importMapData,
      finishDrawing,
      cancelDrawing,
      registerDrawingControls,
    ]
  );

  return (
    <ActionsCtx.Provider value={actionsValue}>
      <DataContext.Provider value={dataValue}>
        <DrawingCtx.Provider value={drawingValue}>
          {children}
        </DrawingCtx.Provider>
      </DataContext.Provider>
    </ActionsCtx.Provider>
  );
}
