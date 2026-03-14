"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import type { DrawMode } from "./draw-engine";
import { geometryTypeToFeatureType } from "./geojson";
import { DEFAULT_LAYER, DEFAULT_MAP, COLORS, DEFAULT_BORDER_WIDTH, FEATURE_LIMIT } from "./defaults";
import { saveToLocalStorage, loadFromLocalStorage } from "./local-storage";
import { BASE_MAPS, type BaseMap } from "./map-style";
import type {
  MapData,
  LayerData,
  FeatureData,
  FeatureUpdate,
  GroupData,
  PointShape,
  LineStyle,
  ArrowStyle,
  LineDecoration,
  FillPattern,
  TextFont,
} from "./types";
import type { DeserializedMap } from "./mapmaker-format";
import { type Coord, rotateCoords, toMercatorY, fromMercatorY } from "./geo-math";

interface EditorDataState {
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  groups: GroupData[];
  selectedFeatureIds: string[];
  selectedFeature: FeatureData | null;
  featureLimitReached: boolean;
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
  selectFeatures: (ids: string[]) => void;
  addFeature: (geometry: GeoJSON.Geometry) => void;
  updateFeature: (id: string, updates: FeatureUpdate) => void;
  deleteFeature: (id: string) => void;
  duplicateFeature: (id: string) => void;
  duplicateGroup: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  clearAllFeatures: () => void;
  reorderFeatures: (orderedIds: string[]) => void;
  createGroup: (featureIds: string[], label: string) => void;
  dissolveGroup: (groupId: string) => void;
  updateGroup: (id: string, updates: Partial<GroupData>) => void;
  reorderItems: (orderedIds: { id: string; kind: "feature" | "group" }[]) => void;
  reorderGroupChildren: (groupId: string, orderedChildIds: string[]) => void;
  addFeatureToGroup: (featureId: string, groupId: string) => void;
  removeFeatureFromGroup: (featureId: string) => void;
  moveGroup: (groupId: string, dlng: number, dlat: number) => void;
  rotateGroup: (groupId: string, deltaAngle: number, center: [number, number]) => void;
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
  recordSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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

function shiftCoords(coords: number[][], dlng: number, dMercY: number): number[][] {
  return coords.map((c) => [c[0] + dlng, fromMercatorY(toMercatorY(c[1]) + dMercY), ...c.slice(2)]);
}

function shiftGeometry(g: GeoJSON.Geometry, dlng: number, dMercY: number): GeoJSON.Geometry {
  switch (g.type) {
    case "Point":
      return { type: "Point", coordinates: [g.coordinates[0] + dlng, fromMercatorY(toMercatorY(g.coordinates[1]) + dMercY)] };
    case "LineString":
      return { type: "LineString", coordinates: shiftCoords(g.coordinates, dlng, dMercY) };
    case "Polygon":
      return { type: "Polygon", coordinates: g.coordinates.map((r) => shiftCoords(r, dlng, dMercY)) };
    default:
      return g;
  }
}

function rotateGeometryCoords(coords: number[][], center: Coord, angle: number): number[][] {
  return rotateCoords(coords as Coord[], center, angle);
}

function rotateGeometry(g: GeoJSON.Geometry, center: Coord, angle: number): GeoJSON.Geometry {
  switch (g.type) {
    case "Point": {
      const [rotated] = rotateCoords([g.coordinates as Coord], center, angle);
      return { type: "Point", coordinates: rotated };
    }
    case "LineString":
      return { type: "LineString", coordinates: rotateGeometryCoords(g.coordinates, center, angle) };
    case "Polygon":
      return { type: "Polygon", coordinates: g.coordinates.map((r) => rotateGeometryCoords(r, center, angle)) };
    default:
      return g;
  }
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<MapData>(DEFAULT_MAP);
  const [layers, setLayers] = useState<LayerData[]>([DEFAULT_LAYER]);
  const [features, setFeatures] = useState<FeatureData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);

  const [drawing, dispatchDrawing] = useReducer(drawingReducer, INITIAL_DRAWING_STATE);

  const selectedFeature = useMemo(
    () => (selectedFeatureIds.length > 0 ? features.find((f) => f.id === selectedFeatureIds[0]) ?? null : null),
    [features, selectedFeatureIds]
  );

  const featureLimitReached = features.length >= FEATURE_LIMIT;

  // Load from localStorage on mount
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    const saved = loadFromLocalStorage();
    if (!saved) return;
    setMap(saved.map);
    setLayers(saved.layers);
    setFeatures(saved.features);
    setGroups(saved.groups);
    dispatchDrawing({ type: "SET", payload: { activeLayerId: saved.layers[0]?.id ?? DEFAULT_LAYER.id, activeBaseMap: saved.baseMap } });
  }, []);

  // Auto-save to localStorage (debounced, skip until initial load is done)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToLocalStorage(map, layers, features, groups, drawing.activeBaseMap.id);
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [map, layers, features, groups, drawing.activeBaseMap]);

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

  type Snapshot = { features: FeatureData[]; layers: LayerData[]; groups: GroupData[] };
  const HISTORY_LIMIT = 50;
  const historyRef = useRef<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });
  const featuresRef = useRef(features);
  featuresRef.current = features;
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  const recordSnapshot = useCallback(() => {
    const h = historyRef.current;
    h.past.push({ features: structuredClone(featuresRef.current), layers: structuredClone(layersRef.current), groups: structuredClone(groupsRef.current) });
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const undo = useCallback(() => {
    const h = historyRef.current;
    const snap = h.past.pop();
    if (!snap) return;
    h.future.push({ features: structuredClone(featuresRef.current), layers: structuredClone(layersRef.current), groups: structuredClone(groupsRef.current) });
    setFeatures(snap.features);
    setLayers(snap.layers);
    setGroups(snap.groups);
    setSelectedFeatureIds([]);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    const snap = h.future.pop();
    if (!snap) return;
    h.past.push({ features: structuredClone(featuresRef.current), layers: structuredClone(layersRef.current), groups: structuredClone(groupsRef.current) });
    setFeatures(snap.features);
    setLayers(snap.layers);
    setGroups(snap.groups);
    setSelectedFeatureIds([]);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

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
    if (featuresRef.current.length >= FEATURE_LIMIT) return;
    recordSnapshot();
    const s = drawingRef.current;
    const currentMode = drawModeRef.current;
    const isText = currentMode === "text";
    const featureType = isText ? "text" as const : geometryTypeToFeatureType(geometry.type);
    const nextOrder = featuresRef.current.length > 0
      ? Math.max(...featuresRef.current.map((f) => f.order)) + 1
      : 0;
    const base = {
      id: uuid(),
      layerId: s.activeLayerId,
      label: s.activeLabel,
      showLabel: false,
      color: s.activeColor,
      opacity: s.activeOpacity,
      order: nextOrder,
      sourceText: s.activeSourceText,
      sourceUrl: s.activeSourceUrl || undefined,
      geometry,
    };
    let newFeature: FeatureData;
    switch (featureType) {
      case "text":
        newFeature = {
          ...base, type: "text",
          textContent: s.activeTextContent || "Text",
          fontSize: s.activeFontSize,
          fontFamily: s.activeFontFamily,
          textBorderEnabled: s.activeTextBorderEnabled,
          textBorderColor: s.activeTextBorderColor,
          textBorderWidth: s.activeTextBorderWidth,
        };
        break;
      case "point":
        newFeature = {
          ...base, type: "point",
          size: s.activeSize,
          shape: s.activeIcon ? undefined : s.activeShape,
          icon: s.activeIcon ?? undefined,
          borderColor: s.activeBorderColor,
          borderWidth: s.activeBorderWidth,
        };
        break;
      case "polyline":
        newFeature = {
          ...base, type: "polyline",
          smoothing: s.activeSmoothing,
          strokeWidth: s.activeStrokeWidth,
          lineStyle: s.activeLineStyle,
          arrowStyle: currentMode === "arrow" ? "forward" : currentMode === "double-arrow" ? "both" : s.activeArrowStyle,
          lineDecoration: s.activeLineDecoration,
          decorationSpacing: s.activeDecorationSpacing,
        };
        break;
      case "polygon":
        newFeature = {
          ...base, type: "polygon",
          shapeOrigin: currentMode === "rectangle" ? "rectangle" : currentMode === "circle" ? "circle" : undefined,
          smoothing: s.activeSmoothing,
          strokeWidth: s.activeStrokeWidth,
          lineStyle: s.activeLineStyle,
          lineDecoration: s.activeLineDecoration,
          decorationSpacing: s.activeDecorationSpacing,
          fillPattern: s.activeFillPattern,
        };
        break;
    }
    setFeatures((prev) => [...prev, newFeature]);
    setSelectedFeatureIds([newFeature.id]);
    dispatchDrawing({ type: "RESET_AFTER_ADD", isText });
  }, [recordSnapshot]);

  const updateFeature = useCallback(
    (id: string, updates: FeatureUpdate) => {
      setFeatures((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } as FeatureData : f))
      );
    },
    []
  );

  const DUPLICATE_OFFSET_LNG = 0.005;
  const DUPLICATE_OFFSET_MERC_Y = 0.005;

  const duplicateFeature = useCallback((id: string) => {
    if (featuresRef.current.length >= FEATURE_LIMIT) return;
    recordSnapshot();
    const source = featuresRef.current.find((f) => f.id === id);
    if (!source) return;
    const maxOrder = featuresRef.current.length > 0
      ? Math.max(...featuresRef.current.map((f) => f.order))
      : -1;
    const clone = {
      ...structuredClone(source),
      id: uuid(),
      order: maxOrder + 1,
      geometry: shiftGeometry(source.geometry, DUPLICATE_OFFSET_LNG, DUPLICATE_OFFSET_MERC_Y),
    } as FeatureData;
    setFeatures((prev) => [...prev, clone]);
    setSelectedFeatureIds([clone.id]);
  }, [recordSnapshot]);

  const duplicateGroup = useCallback((groupId: string) => {
    const groupChildren = featuresRef.current.filter((f) => f.groupId === groupId);
    if (featuresRef.current.length + groupChildren.length > FEATURE_LIMIT) return;
    recordSnapshot();
    const group = groupsRef.current.find((g) => g.id === groupId);
    if (!group) return;
    const newGroupId = uuid();
    const maxGroupOrder = groupsRef.current.length > 0
      ? Math.max(...groupsRef.current.map((g) => g.order))
      : -1;
    const maxFeatureOrder = featuresRef.current.length > 0
      ? Math.max(...featuresRef.current.map((f) => f.order))
      : -1;
    const groupOrder = Math.max(maxGroupOrder, maxFeatureOrder) + 1;
    setGroups((prev) => [...prev, { id: newGroupId, label: group.label, order: groupOrder }]);
    const clones = groupChildren.map((f, i) => ({
      ...structuredClone(f),
      id: uuid(),
      groupId: newGroupId,
      order: i,
      geometry: shiftGeometry(f.geometry, DUPLICATE_OFFSET_LNG, DUPLICATE_OFFSET_MERC_Y),
    } as FeatureData));
    setFeatures((prev) => [...prev, ...clones]);
    setSelectedFeatureIds(clones.map((c) => c.id));
  }, [recordSnapshot]);

  const deleteFeature = useCallback((id: string) => {
    recordSnapshot();
    setFeatures((prev) => prev.filter((f) => f.id !== id));
    setSelectedFeatureIds([]);
  }, [recordSnapshot]);

  const deleteGroup = useCallback((groupId: string) => {
    recordSnapshot();
    setFeatures((prev) => prev.filter((f) => f.groupId !== groupId));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setSelectedFeatureIds([]);
  }, [recordSnapshot]);

  const clearAllFeatures = useCallback(() => {
    recordSnapshot();
    setFeatures([]);
    setGroups([]);
    setSelectedFeatureIds([]);
  }, [recordSnapshot]);

  const addLayer = useCallback((name: string) => {
    recordSnapshot();
    const id = uuid();
    setLayers((prev) => [...prev, { id, name, visible: true, order: prev.length }]);
    set({ activeLayerId: id });
  }, [set, recordSnapshot]);

  const toggleLayer = useCallback((id: string) => {
    recordSnapshot();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }, [recordSnapshot]);

  const deleteLayer = useCallback((id: string) => {
    recordSnapshot();
    setLayers((prev) => {
      const remaining = prev.filter((l) => l.id !== id);
      if (remaining.length === 0) return prev;
      return remaining;
    });
    setFeatures((prev) => prev.filter((f) => f.layerId !== id));
    set({ activeLayerId: DEFAULT_LAYER.id });
  }, [set, recordSnapshot]);

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
  }, [recordSnapshot]);

  const updateMap = useCallback((updates: Partial<MapData>) => {
    setMap((prev) => ({ ...prev, ...updates }));
  }, []);

  const importMapData = useCallback((data: DeserializedMap) => {
    recordSnapshot();
    setMap((prev) => ({ ...prev, ...data.map }));
    setLayers(data.layers);
    setFeatures(
      data.features.slice(0, FEATURE_LIMIT).map((f) => ({ ...f, id: uuid() }) as FeatureData)
    );
    setGroups(data.groups ?? []);
    const bm = BASE_MAPS.find((b) => b.id === data.baseMapId);
    dispatchDrawing({
      type: "SET",
      payload: {
        activeLayerId: data.layers[0]?.id ?? DEFAULT_LAYER.id,
        ...(bm ? { activeBaseMap: bm } : {}),
      },
    });
    setSelectedFeatureIds([]);
  }, [recordSnapshot]);

  const selectFeature = useCallback((id: string | null) => {
    setSelectedFeatureIds(id ? [id] : []);
  }, []);

  const selectFeatures = useCallback((ids: string[]) => {
    setSelectedFeatureIds(ids);
  }, []);

  const createGroup = useCallback((featureIds: string[], label: string) => {
    recordSnapshot();
    const groupId = uuid();
    const maxGroupOrder = groupsRef.current.length > 0
      ? Math.max(...groupsRef.current.map((g) => g.order))
      : -1;
    const maxFeatureOrder = featuresRef.current.length > 0
      ? Math.max(...featuresRef.current.map((f) => f.order))
      : -1;
    const groupOrder = Math.max(maxGroupOrder, maxFeatureOrder) + 1;
    setGroups((prev) => [...prev, { id: groupId, label, order: groupOrder }]);
    setFeatures((prev) =>
      prev.map((f) =>
        featureIds.includes(f.id) ? { ...f, groupId } as FeatureData : f
      )
    );
  }, [recordSnapshot]);

  const dissolveGroup = useCallback((groupId: string) => {
    recordSnapshot();
    setFeatures((prev) =>
      prev.map((f) =>
        f.groupId === groupId ? { ...f, groupId: undefined } as FeatureData : f
      )
    );
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, [recordSnapshot]);

  const updateGroup = useCallback((id: string, updates: Partial<GroupData>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  }, []);

  const reorderItems = useCallback((orderedIds: { id: string; kind: "feature" | "group" }[]) => {
    recordSnapshot();
    let order = 0;
    const groupOrderMap = new Map<string, number>();
    const featureOrderMap = new Map<string, number>();
    for (const item of orderedIds) {
      if (item.kind === "group") {
        groupOrderMap.set(item.id, order);
      } else {
        featureOrderMap.set(item.id, order);
      }
      order++;
    }
    setGroups((prev) =>
      prev.map((g) => {
        const newOrder = groupOrderMap.get(g.id);
        return newOrder !== undefined ? { ...g, order: newOrder } : g;
      })
    );
    setFeatures((prev) =>
      prev.map((f) => {
        const newOrder = featureOrderMap.get(f.id);
        return newOrder !== undefined ? { ...f, order: newOrder } as FeatureData : f;
      })
    );
  }, [recordSnapshot]);

  const addFeatureToGroup = useCallback((featureId: string, groupId: string) => {
    recordSnapshot();
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, groupId } as FeatureData : f))
    );
  }, [recordSnapshot]);

  const removeFeatureFromGroup = useCallback((featureId: string) => {
    recordSnapshot();
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, groupId: undefined } as FeatureData : f))
    );
  }, [recordSnapshot]);

  const reorderGroupChildren = useCallback((groupId: string, orderedChildIds: string[]) => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.groupId !== groupId) return f;
        const idx = orderedChildIds.indexOf(f.id);
        return idx === -1 ? f : { ...f, order: idx } as FeatureData;
      })
    );
  }, []);

  const moveGroup = useCallback((groupId: string, dlng: number, dMercY: number) => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.groupId !== groupId) return f;
        const g = f.geometry;
        const shifted = shiftGeometry(g, dlng, dMercY);
        return { ...f, geometry: shifted } as FeatureData;
      })
    );
  }, []);

  const rotateGroup = useCallback((groupId: string, deltaAngle: number, center: [number, number]) => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.groupId !== groupId) return f;
        const g = f.geometry;
        const rotated = rotateGeometry(g, center as Coord, deltaAngle);
        return { ...f, geometry: rotated } as FeatureData;
      })
    );
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
    () => ({ map, layers, features, groups, selectedFeatureIds, selectedFeature, featureLimitReached }),
    [map, layers, features, groups, selectedFeatureIds, selectedFeature, featureLimitReached]
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
      selectFeatures,
      addFeature,
      updateFeature,
      duplicateFeature,
      duplicateGroup,
      deleteFeature,
      deleteGroup,
      clearAllFeatures,
      reorderFeatures,
      createGroup,
      dissolveGroup,
      updateGroup,
      reorderItems,
      reorderGroupChildren,
      addFeatureToGroup,
      removeFeatureFromGroup,
      moveGroup,
      rotateGroup,
      addLayer,
      toggleLayer,
      deleteLayer,
      setActiveBaseMap,
      updateMap,
      importMapData,
      finishDrawing,
      cancelDrawing,
      registerDrawingControls,
      recordSnapshot,
      undo,
      redo,
      canUndo,
      canRedo,
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
      selectFeatures,
      addFeature,
      updateFeature,
      duplicateFeature,
      duplicateGroup,
      deleteFeature,
      deleteGroup,
      clearAllFeatures,
      reorderFeatures,
      createGroup,
      dissolveGroup,
      updateGroup,
      reorderItems,
      reorderGroupChildren,
      addFeatureToGroup,
      removeFeatureFromGroup,
      moveGroup,
      rotateGroup,
      addLayer,
      toggleLayer,
      deleteLayer,
      setActiveBaseMap,
      updateMap,
      importMapData,
      finishDrawing,
      cancelDrawing,
      registerDrawingControls,
      recordSnapshot,
      undo,
      redo,
      canUndo,
      canRedo,
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
