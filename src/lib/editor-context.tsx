"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  useEffect,
} from "react";
import { v4 as uuid } from "uuid";
import type { DrawMode } from "./draw-engine";
import { geometryTypeToFeatureType } from "./geojson";
import { DEFAULT_LAYER, DEFAULT_MAP, COLORS, DEFAULT_BORDER_WIDTH, FEATURE_LIMIT } from "./defaults";
import { saveToLocalStorage, loadFromLocalStorage, setStorageErrorHandler, type StorageError } from "./local-storage";
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
import { type Coord } from "./geo-math";
import { nextOrder, shiftGeometry, rotateGeometry } from "./geometry-transforms";
import { type DrawingState, type DrawingPayload, INITIAL_DRAWING_STATE, drawingReducer } from "./drawing-state";
import { useUndoRedo } from "./hooks/use-undo-redo";

interface EditorDataState {
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  groups: GroupData[];
  selectedFeatureIds: string[];
  selectedFeature: FeatureData | null;
  featureLimitReached: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

interface EditorActions {
  setDrawMode: (mode: DrawMode) => void;
  setActiveLabel: (label: string) => void;
  setActiveSourceText: (text: string) => void;
  setActiveSourceUrl: (url: string) => void;
  setActiveColor: (color: string) => void;
  setActiveOpacity: (opacity: number) => void;
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
  addBankFeature: (geometry: GeoJSON.Geometry, label: string, sourceText: string) => void;
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

export interface StoredMapState {
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  groups: GroupData[];
  baseMapId: string;
}

interface EditorProviderProps {
  children: React.ReactNode;
  initialData?: StoredMapState;
  onSave?: (state: StoredMapState) => void;
}

const STORAGE_MESSAGES: Record<StorageError, string> = {
  quota_exceeded: "Storage full — your changes may not be saved. Export your map to avoid data loss.",
  save_failed: "Failed to save locally. Export your map to avoid data loss.",
  load_corrupted: "Local save data was corrupted and could not be loaded.",
};

export function EditorProvider({ children, initialData, onSave }: EditorProviderProps) {
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    setStorageErrorHandler((error) => {
      setStorageWarning(STORAGE_MESSAGES[error]);
    });
    return () => setStorageErrorHandler(() => {});
  }, []);

  const [map, setMap] = useState<MapData>(initialData?.map ?? DEFAULT_MAP);
  const [layers, setLayers] = useState<LayerData[]>(initialData?.layers ?? [DEFAULT_LAYER]);
  const [features, setFeatures] = useState<FeatureData[]>(initialData?.features ?? []);
  const [groups, setGroups] = useState<GroupData[]>(initialData?.groups ?? []);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);

  const initialBaseMap = initialData?.baseMapId
    ? BASE_MAPS.find((b) => b.id === initialData.baseMapId) ?? BASE_MAPS[0]
    : BASE_MAPS[0];
  const [drawing, dispatchDrawing] = useReducer(drawingReducer, {
    ...INITIAL_DRAWING_STATE,
    activeBaseMap: initialBaseMap,
  });

  const selectedFeature = useMemo(
    () => (selectedFeatureIds.length > 0 ? features.find((f) => f.id === selectedFeatureIds[0]) ?? null : null),
    [features, selectedFeatureIds]
  );

  const featureLimitReached = features.length >= FEATURE_LIMIT;

  const hasLoadedRef = useRef(!!initialData);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    const saved = loadFromLocalStorage();
    if (!saved) return;
    setMap(saved.map);
    setLayers(saved.layers);
    setFeatures(saved.features);
    setGroups(saved.groups);
    dispatchDrawing({ type: "SET", payload: { activeBaseMap: saved.baseMap } });
  }, []);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const state: StoredMapState = {
        map,
        layers,
        features,
        groups,
        baseMapId: drawing.activeBaseMap.id,
      };
      if (onSaveRef.current) {
        onSaveRef.current(state);
      } else {
        saveToLocalStorage(map, layers, features, groups, drawing.activeBaseMap.id);
      }
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

  const featuresRef = useRef(features);
  featuresRef.current = features;
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const selectedIdsRef = useRef(selectedFeatureIds);
  selectedIdsRef.current = selectedFeatureIds;

  const { canUndo, canRedo, recordSnapshot, undo, redo } = useUndoRedo(
    featuresRef, layersRef, groupsRef,
    setFeatures, setLayers, setGroups, setSelectedFeatureIds,
  );

  const set = useCallback(
    (payload: DrawingPayload) => dispatchDrawing({ type: "SET", payload }),
    []
  );

  const setDrawMode = useCallback((mode: DrawMode) => {
    const typeMap: Record<string, FeatureData["type"]> = {
      polygon: "polygon", rectangle: "polygon", circle: "polygon",
      polyline: "polyline", arrow: "polyline", "double-arrow": "polyline",
      point: "point", text: "text",
    };
    const featureType = typeMap[mode];
    if (!featureType) {
      dispatchDrawing({ type: "SET", payload: { drawMode: mode } });
      return;
    }
    const last = [...featuresRef.current].reverse().find((f) => f.type === featureType);
    if (!last) {
      dispatchDrawing({ type: "SET", payload: { drawMode: mode } });
      return;
    }
    const payload: DrawingPayload = {
      drawMode: mode,
      activeColor: last.color,
      activeOpacity: last.opacity,
      activeLabel: "",
      activeSourceText: last.sourceText,
      activeSourceUrl: last.sourceUrl ?? "",
    };
    switch (last.type) {
      case "polygon":
        payload.activeStroke = {
          smoothing: last.smoothing,
          strokeWidth: last.strokeWidth,
          lineStyle: last.lineStyle,
          lineDecoration: last.lineDecoration,
          decorationSpacing: last.decorationSpacing,
          fillPattern: last.fillPattern,
        };
        break;
      case "polyline":
        payload.activeStroke = {
          smoothing: last.smoothing,
          strokeWidth: last.strokeWidth,
          lineStyle: last.lineStyle,
          arrowStyle: last.arrowStyle,
          lineDecoration: last.lineDecoration,
          decorationSpacing: last.decorationSpacing,
        };
        break;
      case "point":
        payload.activePoint = {
          size: last.size,
          shape: last.shape ?? "circle",
          icon: last.icon ?? null,
          borderColor: last.borderColor,
          borderWidth: last.borderWidth,
        };
        break;
      case "text":
        payload.activeText = {
          fontSize: last.fontSize,
          fontFamily: last.fontFamily,
          textBorderEnabled: last.textBorderEnabled,
          textBorderColor: last.textBorderColor,
          textBorderWidth: last.textBorderWidth,
        };
        break;
    }
    dispatchDrawing({ type: "SET", payload });
  }, []);
  const setActiveLabel = useCallback((label: string) => set({ activeLabel: label }), [set]);
  const setActiveSourceText = useCallback((text: string) => set({ activeSourceText: text }), [set]);
  const setActiveSourceUrl = useCallback((url: string) => set({ activeSourceUrl: url }), [set]);
  const setActiveColor = useCallback((color: string) => set({ activeColor: color }), [set]);
  const setActiveOpacity = useCallback((opacity: number) => set({ activeOpacity: opacity }), [set]);
  const setActiveSize = useCallback((size: number) => set({ activePoint: { size } }), [set]);
  const setActiveShape = useCallback((shape: PointShape) => set({ activePoint: { shape } }), [set]);
  const setActiveIcon = useCallback((icon: string | null) => set({ activePoint: { icon } }), [set]);
  const setActiveBorderColor = useCallback((color: string) => set({ activePoint: { borderColor: color } }), [set]);
  const setActiveBorderWidth = useCallback((width: number) => set({ activePoint: { borderWidth: width } }), [set]);
  const setActiveSmoothing = useCallback((smoothing: number) => set({ activeStroke: { smoothing } }), [set]);
  const setActiveStrokeWidth = useCallback((width: number) => set({ activeStroke: { strokeWidth: width } }), [set]);
  const setActiveLineStyle = useCallback((style: LineStyle) => set({ activeStroke: { lineStyle: style } }), [set]);
  const setActiveArrowStyle = useCallback((style: ArrowStyle) => set({ activeStroke: { arrowStyle: style } }), [set]);
  const setActiveLineDecoration = useCallback((decoration: LineDecoration) => set({ activeStroke: { lineDecoration: decoration } }), [set]);
  const setActiveDecorationSpacing = useCallback((spacing: number) => set({ activeStroke: { decorationSpacing: spacing } }), [set]);
  const setActiveFillPattern = useCallback((pattern: FillPattern) => set({ activeStroke: { fillPattern: pattern } }), [set]);
  const setActiveTextContent = useCallback((text: string) => set({ activeText: { textContent: text } }), [set]);
  const setActiveFontSize = useCallback((size: number) => set({ activeText: { fontSize: size } }), [set]);
  const setActiveFontFamily = useCallback((font: TextFont) => set({ activeText: { fontFamily: font } }), [set]);
  const setActiveTextBorderEnabled = useCallback((enabled: boolean) => set({ activeText: { textBorderEnabled: enabled } }), [set]);
  const setActiveTextBorderColor = useCallback((color: string) => set({ activeText: { textBorderColor: color } }), [set]);
  const setActiveTextBorderWidth = useCallback((width: number) => set({ activeText: { textBorderWidth: width } }), [set]);
  const setActiveBaseMap = useCallback((baseMap: BaseMap) => set({ activeBaseMap: baseMap }), [set]);

  const addFeature = useCallback((geometry: GeoJSON.Geometry) => {
    if (featuresRef.current.length >= FEATURE_LIMIT) return;
    recordSnapshot();
    const s = drawingRef.current;
    const currentMode = drawModeRef.current;
    const isText = currentMode === "text";
    const featureType = isText ? "text" as const : geometryTypeToFeatureType(geometry.type);
    const order = nextOrder(featuresRef.current);
    const base = {
      id: uuid(),
      layerId: DEFAULT_LAYER.id,
      label: s.activeLabel,
      showLabel: false,
      showInLegend: false,
      color: s.activeColor,
      opacity: s.activeOpacity,
      order,
      sourceText: s.activeSourceText,
      sourceUrl: s.activeSourceUrl || undefined,
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
          shape: s.activePoint.icon ? undefined : s.activePoint.shape,
          icon: s.activePoint.icon ?? undefined,
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
  }, [recordSnapshot]);

  const addBankFeature = useCallback((geometry: GeoJSON.Geometry, label: string, sourceText: string) => {
    if (featuresRef.current.length >= FEATURE_LIMIT) return;
    recordSnapshot();
    const s = drawingRef.current;
    const featureType = geometryTypeToFeatureType(geometry.type);
    const order = nextOrder(featuresRef.current);
    const base = {
      id: uuid(),
      layerId: DEFAULT_LAYER.id,
      label,
      showLabel: false,
      showInLegend: false,
      color: s.activeColor,
      opacity: s.activeOpacity,
      order,
      sourceText,
      geometry,
    };
    let newFeature: FeatureData;
    switch (featureType) {
      case "polygon":
        newFeature = {
          ...base, type: "polygon",
          smoothing: 0,
          strokeWidth: 3,
          lineStyle: "solid",
          lineDecoration: "none",
          decorationSpacing: 50,
          fillPattern: "none",
        };
        break;
      case "polyline":
        newFeature = {
          ...base, type: "polyline",
          smoothing: 0,
          strokeWidth: 3,
          lineStyle: "solid",
          arrowStyle: "none",
          lineDecoration: "none",
          decorationSpacing: 50,
        };
        break;
      case "point":
        newFeature = {
          ...base, type: "point",
          size: 1,
          shape: "circle",
          borderColor: COLORS.white,
          borderWidth: DEFAULT_BORDER_WIDTH,
        };
        break;
      default:
        return;
    }
    setFeatures((prev) => [...prev, newFeature]);
    setSelectedFeatureIds([newFeature.id]);
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
    const clone = {
      ...structuredClone(source),
      id: uuid(),
      order: nextOrder(featuresRef.current),
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
    const groupOrder = Math.max(nextOrder(groupsRef.current), nextOrder(featuresRef.current));
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
    if (bm) {
      dispatchDrawing({ type: "SET", payload: { activeBaseMap: bm } });
    }
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
    const groupOrder = Math.max(nextOrder(groupsRef.current), nextOrder(featuresRef.current));
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target;
      const inInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const ids = selectedIdsRef.current;
        if (ids.length === 0) return;
        const first = featuresRef.current.find((f) => f.id === ids[0]);
        if (ids.length > 1 && first?.groupId) {
          duplicateGroup(first.groupId);
        } else if (first) {
          duplicateFeature(first.id);
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !inInput) {
        const ids = selectedIdsRef.current;
        if (ids.length === 0) return;
        const first = featuresRef.current.find((f) => f.id === ids[0]);
        if (ids.length > 1 && first?.groupId) {
          deleteGroup(first.groupId);
        } else if (first) {
          deleteFeature(first.id);
        }
        return;
      }

      if (e.key === "Escape" && !inInput && drawModeRef.current === "select") {
        setSelectedFeatureIds([]);
        return;
      }

      if (inInput || mod || e.altKey) return;
      const modeMap: Record<string, DrawMode> = {
        v: "select", p: "polygon", l: "polyline", m: "point",
        r: "rectangle", c: "circle", t: "text",
      };
      const mode = modeMap[e.key.toLowerCase()];
      if (mode) {
        e.preventDefault();
        setDrawMode(mode);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [duplicateFeature, duplicateGroup, deleteFeature, deleteGroup, setDrawMode]);

  const dataValue = useMemo<EditorDataState>(
    () => ({ map, layers, features, groups, selectedFeatureIds, selectedFeature, featureLimitReached, canUndo, canRedo }),
    [map, layers, features, groups, selectedFeatureIds, selectedFeature, featureLimitReached, canUndo, canRedo]
  );

  const actionsValue = useMemo<EditorActions>(
    () => ({
      setDrawMode,
      setActiveLabel,
      setActiveSourceText,
      setActiveSourceUrl,
      setActiveColor,
      setActiveOpacity,
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
      addBankFeature,
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
      setActiveBaseMap,
      updateMap,
      importMapData,
      finishDrawing,
      cancelDrawing,
      registerDrawingControls,
      recordSnapshot,
      undo,
      redo,
    }),
    [
      setDrawMode,
      setActiveLabel,
      setActiveSourceText,
      setActiveSourceUrl,
      setActiveColor,
      setActiveOpacity,
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
      addBankFeature,
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
      setActiveBaseMap,
      updateMap,
      importMapData,
      finishDrawing,
      cancelDrawing,
      registerDrawingControls,
      recordSnapshot,
      undo,
      redo,
    ]
  );

  return (
    <ActionsCtx.Provider value={actionsValue}>
      <DataContext.Provider value={dataValue}>
        <DrawingCtx.Provider value={drawing}>
          {storageWarning && (
            <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-amber-950 text-sm text-center px-4 py-2 flex items-center justify-center gap-2">
              <span>{storageWarning}</span>
              <button onClick={() => setStorageWarning(null)} className="font-bold hover:underline">Dismiss</button>
            </div>
          )}
          {children}
        </DrawingCtx.Provider>
      </DataContext.Provider>
    </ActionsCtx.Provider>
  );
}
