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
import { DEFAULT_MAP, FEATURE_LIMIT } from "./defaults";
import toast from "react-hot-toast";
import { saveToLocalStorage, loadFromLocalStorage, setStorageErrorHandler, type StorageError } from "./local-storage";
import { BASE_MAPS, findBaseMap, type BaseMap } from "./map-style";
import type {
  MapData,
  FeatureData,
  FeatureUpdate,
  GroupData,
  LegendEntry,
  NewLegendEntry,
  PointShape,
  LineStyle,
  ArrowStyle,
  LineDecoration,
  FillPattern,
  TextFont,
  ChoroplethData,
} from "./types";
import { DEFAULT_CHOROPLETH } from "./types";
import type { DeserializedMap } from "./mapmaker-format";
import { computeFeaturesBounds } from "./geojson";
import { type DrawingState, type DrawingPayload, INITIAL_DRAWING_STATE, drawingReducer } from "./drawing-state";
import { useUndoRedo } from "./hooks/use-undo-redo";
import { useFeatureActions } from "./hooks/use-feature-actions";
import { useGroupActions } from "./hooks/use-group-actions";
import { useLegendActions } from "./hooks/use-legend-actions";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";

interface EditorDataState {
  map: MapData;
  features: FeatureData[];
  groups: GroupData[];
  legendEntries: LegendEntry[];
  selectedFeatureIds: string[];
  selectedFeature: FeatureData | null;
  featureLimitReached: boolean;
  featureLimit: number;
  choropleth: ChoroplethData;
  choroplethMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

interface EditorActions {
  setDrawMode: (mode: DrawMode) => void;
  setActiveLabel: (label: string) => void;
  setActiveColor: (color: string) => void;
  setActiveOpacity: (opacity: number) => void;
  setActiveSize: (size: number) => void;
  setActiveShape: (shape: PointShape) => void;
  setActiveCustomSvg: (svg: string | null) => void;
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
  addBankFeature: (geometry: GeoJSON.Geometry, label: string) => void;
  updateFeature: (id: string, updates: FeatureUpdate) => void;
  deleteFeature: (id: string) => void;
  duplicateFeature: (id: string) => void;
  addLabelToFeature: (id: string) => void;
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
  addLegendEntry: (entry: NewLegendEntry) => string;
  updateLegendEntry: (id: string, updates: Partial<LegendEntry>) => void;
  deleteLegendEntry: (id: string) => void;
  assignLegendEntry: (featureId: string, legendEntryId: string | null) => void;
  deduceLegendEntryFromFeature: (featureId: string, label: string) => void;
  setActiveBaseMap: (baseMap: BaseMap) => void;
  setStyleOptions: (options: import("./map-style").StyleOptions) => void;
  setChoropleth: (updates: Partial<ChoroplethData>) => void;
  addChoroplethCategory: (color: string, label: string) => string;
  updateChoroplethCategory: (id: string, updates: Partial<{ color: string; label: string }>) => void;
  deleteChoroplethCategory: (id: string) => void;
  assignChoroplethCategory: (featureId: string, categoryId: string | null) => void;
  assignCountryToCategory: (iso: string, name: string) => void;
  unassignCountry: (iso: string) => void;
  importChoroplethData: (categories: { label: string; color: string; countries: string[] }[]) => void;
  setGradientValue: (iso: string, value: number) => void;
  removeGradientValue: (iso: string) => void;
  importGradientData: (data: Record<string, number>) => void;
  updateMap: (updates: Partial<MapData>) => void;
  setChoroplethMode: (active: boolean) => void;
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
  features: FeatureData[];
  groups: GroupData[];
  legendEntries: LegendEntry[];
  baseMapId: string;
  styleOptions?: import("./map-style").StyleOptions;
  choropleth?: ChoroplethData;
}

interface EditorProviderProps {
  children: React.ReactNode;
  initialData?: StoredMapState;
  onSave?: (state: StoredMapState) => void;
  featureLimit?: number;
  isAnonymous?: boolean;
}

const STORAGE_MESSAGES: Record<StorageError, string> = {
  quota_exceeded: "Storage full — your changes may not be saved. Export your map to avoid data loss.",
  save_failed: "Failed to save locally. Export your map to avoid data loss.",
  load_corrupted: "Local save data was corrupted and could not be loaded.",
};

export function EditorProvider({ children, initialData, onSave, featureLimit = FEATURE_LIMIT, isAnonymous = false }: EditorProviderProps) {
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    setStorageErrorHandler((error) => {
      setStorageWarning(STORAGE_MESSAGES[error]);
    });
    return () => setStorageErrorHandler(() => {});
  }, []);

  const [map, setMap] = useState<MapData>(initialData?.map ?? DEFAULT_MAP);
  const [features, setFeatures] = useState<FeatureData[]>(initialData?.features ?? []);
  const [groups, setGroups] = useState<GroupData[]>(initialData?.groups ?? []);
  const [legendEntries, setLegendEntries] = useState<LegendEntry[]>(initialData?.legendEntries ?? []);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [choropleth, setChoroplethState] = useState<ChoroplethData>(initialData?.choropleth ?? DEFAULT_CHOROPLETH);
  const [choroplethMode, setChoroplethMode] = useState(false);

  const initialBaseMap = initialData?.baseMapId
    ? findBaseMap(initialData.baseMapId)
    : BASE_MAPS[0];
  const [drawing, dispatchDrawing] = useReducer(drawingReducer, {
    ...INITIAL_DRAWING_STATE,
    activeBaseMap: initialBaseMap,
    styleOptions: initialData?.styleOptions ?? {},
  });

  const selectedFeature = useMemo(
    () => (selectedFeatureIds.length > 0 ? features.find((f) => f.id === selectedFeatureIds[0]) ?? null : null),
    [features, selectedFeatureIds]
  );

  const featureLimitReached = featureLimit !== Infinity && features.length >= featureLimit;

  const hasLoadedRef = useRef(!!initialData);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    const saved = loadFromLocalStorage();
    if (!saved) return;
    setMap(saved.map);
    setFeatures(saved.features);
    setGroups(saved.groups);
    setLegendEntries(saved.legendEntries);
    if (saved.choropleth) setChoroplethState(saved.choropleth);
    dispatchDrawing({ type: "SET", payload: { activeBaseMap: saved.baseMap, styleOptions: saved.styleOptions ?? {} } });
  }, []);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const state: StoredMapState = {
        map, features, groups, legendEntries,
        baseMapId: drawing.activeBaseMap.id,
        styleOptions: drawing.styleOptions,
        choropleth,
      };
      if (onSaveRef.current) {
        onSaveRef.current(state);
      } else {
        saveToLocalStorage(map, features, groups, legendEntries, drawing.activeBaseMap.id, drawing.styleOptions, choropleth);
      }
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [map, features, groups, legendEntries, drawing.activeBaseMap, drawing.styleOptions, choropleth]);

  const drawModeRef = useRef(drawing.drawMode);
  drawModeRef.current = drawing.drawMode;
  const drawingRef = useRef(drawing);
  drawingRef.current = drawing;
  const featuresRef = useRef(features);
  featuresRef.current = features;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const legendEntriesRef = useRef(legendEntries);
  legendEntriesRef.current = legendEntries;
  const choroplethRef = useRef(choropleth);
  choroplethRef.current = choropleth;
  const selectedIdsRef = useRef(selectedFeatureIds);
  selectedIdsRef.current = selectedFeatureIds;

  const drawingControlsRef = useRef<{
    finishDrawing: () => void;
    cancelDrawing: () => void;
  }>({
    finishDrawing: () => {},
    cancelDrawing: () => {},
  });

  const { canUndo, canRedo, recordSnapshot, undo, redo } = useUndoRedo(
    featuresRef, groupsRef, legendEntriesRef, choroplethRef,
    setFeatures, setGroups, setLegendEntries, setChoroplethState, setSelectedFeatureIds,
  );

  // Drawing state setters

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
    };
    switch (last.type) {
      case "polygon":
        payload.activeStroke = {
          smoothing: last.smoothing, strokeWidth: last.strokeWidth,
          lineStyle: last.lineStyle, lineDecoration: last.lineDecoration,
          decorationSpacing: last.decorationSpacing, fillPattern: last.fillPattern,
        };
        break;
      case "polyline":
        payload.activeStroke = {
          smoothing: last.smoothing, strokeWidth: last.strokeWidth,
          lineStyle: last.lineStyle, arrowStyle: last.arrowStyle,
          lineDecoration: last.lineDecoration, decorationSpacing: last.decorationSpacing,
        };
        break;
      case "point":
        payload.activePoint = {
          size: last.size, shape: last.shape ?? "circle",
          customSvg: last.customSvg ?? null, borderColor: last.borderColor, borderWidth: last.borderWidth,
        };
        break;
      case "text":
        payload.activeText = {
          fontSize: last.fontSize, fontFamily: last.fontFamily,
          textBorderEnabled: last.textBorderEnabled, textBorderColor: last.textBorderColor,
          textBorderWidth: last.textBorderWidth,
        };
        break;
    }
    dispatchDrawing({ type: "SET", payload });
  }, []);

  const setActiveLabel = useCallback((label: string) => set({ activeLabel: label }), [set]);
  const setActiveColor = useCallback((color: string) => set({ activeColor: color }), [set]);
  const setActiveOpacity = useCallback((opacity: number) => set({ activeOpacity: opacity }), [set]);
  const setActiveSize = useCallback((size: number) => set({ activePoint: { size } }), [set]);
  const setActiveShape = useCallback((shape: PointShape) => set({ activePoint: { shape } }), [set]);
  const setActiveCustomSvg = useCallback((customSvg: string | null) => set({ activePoint: { customSvg } }), [set]);
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
  const setStyleOptions = useCallback((options: import("./map-style").StyleOptions) => set({ styleOptions: options }), [set]);

  // Delegated action hooks

  const onFeatureAdded = useCallback((newCount: number) => {
    if (!isAnonymous) return;
    if (newCount === 2) {
      toast((t) => (
        <div className="flex items-center gap-2">
          <span>Create a free account to save your maps and get more features!</span>
          <button onClick={() => toast.dismiss(t.id)} className="shrink-0 font-bold text-amber-800 hover:text-amber-950">&times;</button>
        </div>
      ), {
        icon: "\u26a0\ufe0f",
        duration: 8000,
        style: { background: "#fef3c7", color: "#92400e", border: "1px solid #f59e0b" },
      });
    }
  }, [isAnonymous]);

  const {
    selectFeature, selectFeatures,
    addFeature, addBankFeature, updateFeature,
    duplicateFeature, addLabelToFeature, deleteFeature,
    clearAllFeatures, reorderFeatures,
  } = useFeatureActions({
    featuresRef, drawingRef, drawModeRef,
    setFeatures, setSelectedFeatureIds, dispatchDrawing,
    recordSnapshot, featureLimit, onFeatureAdded,
  });

  const {
    createGroup, dissolveGroup, updateGroup,
    duplicateGroup, deleteGroup,
    reorderItems, reorderGroupChildren,
    addFeatureToGroup, removeFeatureFromGroup,
    moveGroup, rotateGroup,
  } = useGroupActions({
    featuresRef, groupsRef,
    setFeatures, setGroups, setSelectedFeatureIds,
    recordSnapshot, featureLimit,
  });

  const {
    addLegendEntry, updateLegendEntry, deleteLegendEntry,
    assignLegendEntry, deduceLegendEntryFromFeature,
  } = useLegendActions({
    featuresRef, legendEntriesRef,
    setFeatures, setLegendEntries,
    recordSnapshot,
  });

  // Cross-cutting actions

  const setChoropleth = useCallback((updates: Partial<ChoroplethData>) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      const next = { ...prev, ...updates };
      if (prev.enabled && next.enabled === false) {
        const catById = new Map(prev.categories.map((c) => [c.id, c]));
        setFeatures((feats) => feats.map((f) => {
          if (!f.choroplethCategoryId) return f;
          const cat = catById.get(f.choroplethCategoryId);
          if (!cat) return { ...f, choroplethCategoryId: undefined } as FeatureData;
          return { ...f, color: cat.color, opacity: prev.opacity, choroplethCategoryId: undefined } as FeatureData;
        }));
      }
      return next;
    });
  }, [recordSnapshot, setFeatures]);

  const assignChoroplethCategory = useCallback((featureId: string, categoryId: string | null) => {
    recordSnapshot();
    setFeatures((prev) => prev.map((f) => {
      if (f.id !== featureId) return f;
      if (categoryId === null) {
        return { ...f, choroplethCategoryId: undefined } as FeatureData;
      }
      return { ...f, choroplethCategoryId: categoryId, legendEntryId: undefined } as FeatureData;
    }));
  }, [recordSnapshot, setFeatures]);

  const addChoroplethCategory = useCallback((color: string, label: string): string => {
    recordSnapshot();
    const id = uuid();
    setChoroplethState((prev) => {
      const maxOrder = prev.categories.reduce((m, c) => Math.max(m, c.order), -1);
      return {
        ...prev,
        categories: [...prev.categories, { id, color, label, order: maxOrder + 1 }],
        activeCategoryId: id,
      };
    });
    return id;
  }, [recordSnapshot]);

  const updateChoroplethCategory = useCallback((id: string, updates: Partial<{ color: string; label: string }>) => {
    recordSnapshot();
    setChoroplethState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => c.id === id ? { ...c, ...updates } : c),
    }));
  }, [recordSnapshot]);

  const deleteChoroplethCategory = useCallback((id: string) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      const cat = prev.categories.find((c) => c.id === id);
      if (cat) {
        setFeatures((feats) => feats.map((f) =>
          f.choroplethCategoryId === id
            ? ({ ...f, color: cat.color, opacity: prev.opacity, choroplethCategoryId: undefined } as FeatureData)
            : f
        ));
      }
      const assignments = { ...prev.assignments };
      for (const iso of Object.keys(assignments)) {
        if (assignments[iso] === id) delete assignments[iso];
      }
      return {
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        assignments,
        activeCategoryId: prev.activeCategoryId === id ? null : prev.activeCategoryId,
      };
    });
  }, [recordSnapshot, setFeatures]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const assignCountryToCategory = useCallback((iso: string, _name: string) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      if (!prev.activeCategoryId) return prev;
      return { ...prev, assignments: { ...prev.assignments, [iso]: prev.activeCategoryId } };
    });
  }, [recordSnapshot]);

  const unassignCountry = useCallback((iso: string) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      const assignments = { ...prev.assignments };
      delete assignments[iso];
      return { ...prev, assignments };
    });
  }, [recordSnapshot]);

  const importChoroplethData = useCallback((data: { label: string; color: string; countries: string[] }[]) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      const newCategories = [...prev.categories];
      const newAssignments = { ...prev.assignments };
      let maxOrder = newCategories.reduce((m, c) => Math.max(m, c.order), -1);
      for (const item of data) {
        const id = uuid();
        newCategories.push({ id, color: item.color, label: item.label, order: ++maxOrder });
        for (const iso of item.countries) {
          newAssignments[iso] = id;
        }
      }
      return { ...prev, categories: newCategories, assignments: newAssignments, enabled: true };
    });
  }, [recordSnapshot]);

  const setGradientValue = useCallback((iso: string, value: number) => {
    recordSnapshot();
    setChoroplethState((prev) => ({
      ...prev,
      values: { ...prev.values, [iso]: value },
    }));
  }, [recordSnapshot]);

  const removeGradientValue = useCallback((iso: string) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      const values = { ...prev.values };
      delete values[iso];
      return { ...prev, values };
    });
  }, [recordSnapshot]);

  const importGradientData = useCallback((data: Record<string, number>) => {
    recordSnapshot();
    setChoroplethState((prev) => ({
      ...prev,
      values: { ...prev.values, ...data },
      enabled: true,
      mode: "gradient",
    }));
  }, [recordSnapshot]);

  const updateMap = useCallback((updates: Partial<MapData>) => {
    setMap((prev) => ({ ...prev, ...updates }));
  }, []);

  const importMapData = useCallback((data: DeserializedMap) => {
    recordSnapshot();
    setMap((prev) => ({ ...prev, ...data.map }));
    const importedFeatures = (featureLimit === Infinity ? data.features : data.features.slice(0, featureLimit))
      .map((f) => ({ ...f, id: uuid() }) as FeatureData);
    setFeatures(importedFeatures);
    setGroups(data.groups ?? []);
    setLegendEntries(data.legendEntries ?? []);
    dispatchDrawing({ type: "SET", payload: { activeBaseMap: findBaseMap(data.baseMapId), styleOptions: data.styleOptions ?? {} } });
    if (data.choropleth) setChoroplethState(data.choropleth);
    setSelectedFeatureIds([]);
    const bounds = computeFeaturesBounds(importedFeatures);
    if (bounds) {
      setTimeout(() => window.dispatchEvent(new CustomEvent("mapmaker:fitbounds", { detail: { bounds } })), 100);
    }
  }, [recordSnapshot, featureLimit]);

  const registerDrawingControls = useCallback(
    (controls: { finishDrawing: () => void; cancelDrawing: () => void }) => {
      drawingControlsRef.current = controls;
    },
    []
  );
  const finishDrawing = useCallback(() => drawingControlsRef.current.finishDrawing(), []);
  const cancelDrawing = useCallback(() => drawingControlsRef.current.cancelDrawing(), []);

  // Keyboard shortcuts

  useKeyboardShortcuts({
    featuresRef, selectedIdsRef, drawModeRef,
    setSelectedFeatureIds, setDrawMode,
    duplicateFeature, duplicateGroup, deleteFeature, deleteGroup,
  });

  // Context values

  const dataValue = useMemo<EditorDataState>(
    () => ({ map, features, groups, legendEntries, selectedFeatureIds, selectedFeature, featureLimitReached, featureLimit, choropleth, choroplethMode, canUndo, canRedo }),
    [map, features, groups, legendEntries, selectedFeatureIds, selectedFeature, featureLimitReached, featureLimit, choropleth, choroplethMode, canUndo, canRedo]
  );

  const actionsValue = useMemo<EditorActions>(
    () => ({
      setDrawMode, setActiveLabel, setActiveColor, setActiveOpacity,
      setActiveSize, setActiveShape, setActiveCustomSvg,
      setActiveBorderColor, setActiveBorderWidth,
      setActiveSmoothing, setActiveStrokeWidth, setActiveLineStyle,
      setActiveArrowStyle, setActiveLineDecoration, setActiveDecorationSpacing,
      setActiveFillPattern, setActiveTextContent, setActiveFontSize,
      setActiveFontFamily, setActiveTextBorderEnabled, setActiveTextBorderColor,
      setActiveTextBorderWidth,
      selectFeature, selectFeatures,
      addFeature, addBankFeature, updateFeature,
      duplicateFeature, addLabelToFeature, duplicateGroup,
      deleteFeature, deleteGroup, clearAllFeatures, reorderFeatures,
      createGroup, dissolveGroup, updateGroup,
      reorderItems, reorderGroupChildren,
      addFeatureToGroup, removeFeatureFromGroup,
      moveGroup, rotateGroup,
      addLegendEntry, updateLegendEntry, deleteLegendEntry,
      assignLegendEntry, deduceLegendEntryFromFeature,
      setActiveBaseMap, setStyleOptions, setChoropleth,
      addChoroplethCategory, updateChoroplethCategory, deleteChoroplethCategory,
      assignChoroplethCategory,
      assignCountryToCategory, unassignCountry, importChoroplethData,
      setGradientValue, removeGradientValue, importGradientData,
      setChoroplethMode, updateMap, importMapData,
      finishDrawing, cancelDrawing, registerDrawingControls,
      recordSnapshot, undo, redo,
    }),
    [
      setDrawMode, setActiveLabel, setActiveColor, setActiveOpacity,
      setActiveSize, setActiveShape, setActiveCustomSvg,
      setActiveBorderColor, setActiveBorderWidth,
      setActiveSmoothing, setActiveStrokeWidth, setActiveLineStyle,
      setActiveArrowStyle, setActiveLineDecoration, setActiveDecorationSpacing,
      setActiveFillPattern, setActiveTextContent, setActiveFontSize,
      setActiveFontFamily, setActiveTextBorderEnabled, setActiveTextBorderColor,
      setActiveTextBorderWidth,
      selectFeature, selectFeatures,
      addFeature, addBankFeature, updateFeature,
      duplicateFeature, addLabelToFeature, duplicateGroup,
      deleteFeature, deleteGroup, clearAllFeatures, reorderFeatures,
      createGroup, dissolveGroup, updateGroup,
      reorderItems, reorderGroupChildren,
      addFeatureToGroup, removeFeatureFromGroup,
      moveGroup, rotateGroup,
      addLegendEntry, updateLegendEntry, deleteLegendEntry,
      assignLegendEntry, deduceLegendEntryFromFeature,
      setActiveBaseMap, setStyleOptions, setChoropleth,
      addChoroplethCategory, updateChoroplethCategory, deleteChoroplethCategory,
      assignChoroplethCategory,
      assignCountryToCategory, unassignCountry, importChoroplethData,
      setGradientValue, removeGradientValue, importGradientData,
      setChoroplethMode, updateMap, importMapData,
      finishDrawing, cancelDrawing, registerDrawingControls,
      recordSnapshot, undo, redo,
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
