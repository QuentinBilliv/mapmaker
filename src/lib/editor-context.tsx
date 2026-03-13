"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
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
  TextFont,
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
  activeTextContent: string;
  activeFontSize: number;
  activeFontFamily: TextFont;
  activeTextBorderEnabled: boolean;
  activeTextBorderColor: string;
  activeTextBorderWidth: number;
  activeBaseMap: BaseMap;
}

type DrawingAction =
  | { type: "SET"; payload: Partial<DrawingState> }
  | { type: "RESET_AFTER_ADD"; isText: boolean };

const INITIAL_DRAWING_STATE: DrawingState = {
  drawMode: "select",
  activeLabel: "",
  activeSourceText: "",
  activeSourceUrl: "",
  activeColor: COLORS.primary,
  activeOpacity: 1,
  activeLayerId: DEFAULT_LAYER.id,
  activeSize: 1,
  activeShape: "circle",
  activeIcon: null,
  activeBorderColor: COLORS.white,
  activeBorderWidth: DEFAULT_BORDER_WIDTH,
  activeSmoothing: 0,
  activeStrokeWidth: 3,
  activeLineStyle: "solid",
  activeArrowStyle: "none",
  activeLineDecoration: "none",
  activeDecorationSpacing: 50,
  activeFillPattern: "none",
  activeTextContent: "",
  activeFontSize: 24,
  activeFontFamily: "sans",
  activeTextBorderEnabled: true,
  activeTextBorderColor: COLORS.white,
  activeTextBorderWidth: 2,
  activeBaseMap: BASE_MAPS[0],
};

function drawingReducer(state: DrawingState, action: DrawingAction): DrawingState {
  switch (action.type) {
    case "SET":
      return { ...state, ...action.payload };
    case "RESET_AFTER_ADD":
      return {
        ...state,
        drawMode: "select",
        activeLabel: "",
        activeSourceText: "",
        activeSourceUrl: "",
        ...(action.isText ? { activeTextContent: "" } : {}),
      };
  }
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
  setActiveTextContent: (text: string) => void;
  setActiveFontSize: (size: number) => void;
  setActiveFontFamily: (font: TextFont) => void;
  setActiveTextBorderEnabled: (enabled: boolean) => void;
  setActiveTextBorderColor: (color: string) => void;
  setActiveTextBorderWidth: (width: number) => void;
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
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const [drawing, dispatchDrawing] = useReducer(drawingReducer, INITIAL_DRAWING_STATE);

  const selectedFeature = useMemo(
    () => features.find((f) => f.id === selectedFeatureId) ?? null,
    [features, selectedFeatureId]
  );

  const drawModeRef = useRef(drawing.drawMode);
  drawModeRef.current = drawing.drawMode;

  const drawingRef = useRef(drawing);
  drawingRef.current = drawing;

  const drawingControlsRef = useRef<{
    finishDrawing: () => void;
    cancelDrawing: () => void;
  }>({
    finishDrawing: () => {},
    cancelDrawing: () => {},
  });

  const set = useCallback(
    (payload: Partial<DrawingState>) => dispatchDrawing({ type: "SET", payload }),
    []
  );

  const setDrawMode = useCallback((mode: DrawMode) => set({ drawMode: mode }), [set]);
  const setActiveLabel = useCallback((label: string) => set({ activeLabel: label }), [set]);
  const setActiveSourceText = useCallback((text: string) => set({ activeSourceText: text }), [set]);
  const setActiveSourceUrl = useCallback((url: string) => set({ activeSourceUrl: url }), [set]);
  const setActiveColor = useCallback((color: string) => set({ activeColor: color }), [set]);
  const setActiveOpacity = useCallback((opacity: number) => set({ activeOpacity: opacity }), [set]);
  const setActiveLayerId = useCallback((id: string) => set({ activeLayerId: id }), [set]);
  const setActiveSize = useCallback((size: number) => set({ activeSize: size }), [set]);
  const setActiveShape = useCallback((shape: PointShape) => set({ activeShape: shape }), [set]);
  const setActiveIcon = useCallback((icon: string | null) => set({ activeIcon: icon }), [set]);
  const setActiveBorderColor = useCallback((color: string) => set({ activeBorderColor: color }), [set]);
  const setActiveBorderWidth = useCallback((width: number) => set({ activeBorderWidth: width }), [set]);
  const setActiveSmoothing = useCallback((smoothing: number) => set({ activeSmoothing: smoothing }), [set]);
  const setActiveStrokeWidth = useCallback((width: number) => set({ activeStrokeWidth: width }), [set]);
  const setActiveLineStyle = useCallback((style: LineStyle) => set({ activeLineStyle: style }), [set]);
  const setActiveArrowStyle = useCallback((style: ArrowStyle) => set({ activeArrowStyle: style }), [set]);
  const setActiveLineDecoration = useCallback((decoration: LineDecoration) => set({ activeLineDecoration: decoration }), [set]);
  const setActiveDecorationSpacing = useCallback((spacing: number) => set({ activeDecorationSpacing: spacing }), [set]);
  const setActiveFillPattern = useCallback((pattern: FillPattern) => set({ activeFillPattern: pattern }), [set]);
  const setActiveTextContent = useCallback((text: string) => set({ activeTextContent: text }), [set]);
  const setActiveFontSize = useCallback((size: number) => set({ activeFontSize: size }), [set]);
  const setActiveFontFamily = useCallback((font: TextFont) => set({ activeFontFamily: font }), [set]);
  const setActiveTextBorderEnabled = useCallback((enabled: boolean) => set({ activeTextBorderEnabled: enabled }), [set]);
  const setActiveTextBorderColor = useCallback((color: string) => set({ activeTextBorderColor: color }), [set]);
  const setActiveTextBorderWidth = useCallback((width: number) => set({ activeTextBorderWidth: width }), [set]);
  const setActiveBaseMap = useCallback((baseMap: BaseMap) => set({ activeBaseMap: baseMap }), [set]);

  const addFeature = useCallback((geometry: GeoJSON.Geometry) => {
    const s = drawingRef.current;
    const currentMode = drawModeRef.current;
    const isText = currentMode === "text";
    const featureType = isText ? "text" as const : geometryTypeToFeatureType(geometry.type);
    const isPoint = featureType === "point";
    const isLine = featureType === "polyline";
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
      smoothing: (isPoint || isText) ? 0 : s.activeSmoothing,
      strokeWidth: (isPoint || isText) ? 0 : s.activeStrokeWidth,
      lineStyle: (isPoint || isText) ? "solid" : s.activeLineStyle,
      arrowStyle: isLine ? arrowFromMode : "none",
      lineDecoration: (isPoint || isText) ? "none" : s.activeLineDecoration,
      decorationSpacing: (isPoint || isText) ? 50 : s.activeDecorationSpacing,
      fillPattern: featureType === "polygon" ? s.activeFillPattern : "none",
      textContent: isText ? (s.activeTextContent || "Text") : undefined,
      fontSize: isText ? s.activeFontSize : undefined,
      fontFamily: isText ? s.activeFontFamily : undefined,
      textBorderEnabled: isText ? s.activeTextBorderEnabled : undefined,
      textBorderColor: isText ? s.activeTextBorderColor : undefined,
      textBorderWidth: isText ? s.activeTextBorderWidth : undefined,
      sourceText: s.activeSourceText,
      sourceUrl: s.activeSourceUrl || undefined,
      geometry,
    };
    setFeatures((prev) => [...prev, newFeature]);
    setSelectedFeatureId(newFeature.id);
    dispatchDrawing({ type: "RESET_AFTER_ADD", isText });
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
    set({ activeLayerId: id });
  }, [set]);

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
    set({ activeLayerId: DEFAULT_LAYER.id });
  }, [set]);

  const updateMap = useCallback((updates: Partial<MapData>) => {
    setMap((prev) => ({ ...prev, ...updates }));
  }, []);

  const importMapData = useCallback((data: DeserializedMap) => {
    setMap((prev) => ({ ...prev, ...data.map }));
    setLayers(data.layers);
    setFeatures(
      data.features.map((f) => ({ ...f, id: uuid() }))
    );
    const bm = BASE_MAPS.find((b) => b.id === data.baseMapId);
    dispatchDrawing({
      type: "SET",
      payload: {
        activeLayerId: data.layers[0]?.id ?? DEFAULT_LAYER.id,
        ...(bm ? { activeBaseMap: bm } : {}),
      },
    });
    setSelectedFeatureId(null);
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
      setActiveTextContent,
      setActiveFontSize,
      setActiveFontFamily,
      setActiveTextBorderEnabled,
      setActiveTextBorderColor,
      setActiveTextBorderWidth,
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
      setActiveTextContent,
      setActiveFontSize,
      setActiveFontFamily,
      setActiveTextBorderEnabled,
      setActiveTextBorderColor,
      setActiveTextBorderWidth,
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
    ]
  );

  return (
    <ActionsCtx.Provider value={actionsValue}>
      <DataContext.Provider value={dataValue}>
        <DrawingCtx.Provider value={drawing}>
          {children}
        </DrawingCtx.Provider>
      </DataContext.Provider>
    </ActionsCtx.Provider>
  );
}
