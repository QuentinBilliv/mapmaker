"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import { DrawMode } from "./draw-engine";
import { geometryTypeToFeatureType } from "./geojson";
import { DEFAULT_LAYER, DEFAULT_MAP } from "./defaults";
import type { MapData, LayerData, FeatureData, PointShape } from "./types";

interface EditorState {
  map: MapData;
  layers: LayerData[];
  features: FeatureData[];
  drawMode: DrawMode;
  activeColor: string;
  activeOpacity: number;
  activeLayerId: string;
  activeShape: PointShape;
  activeIcon: string | null;
  selectedFeature: FeatureData | null;
}

interface EditorActions {
  setDrawMode: (mode: DrawMode) => void;
  setActiveColor: (color: string) => void;
  setActiveOpacity: (opacity: number) => void;
  setActiveLayerId: (id: string) => void;
  setActiveShape: (shape: PointShape) => void;
  setActiveIcon: (icon: string | null) => void;
  selectFeature: (id: string | null) => void;
  addFeature: (geometry: GeoJSON.Geometry) => void;
  updateFeature: (id: string, updates: Partial<FeatureData>) => void;
  deleteFeature: (id: string) => void;
  addLayer: (name: string) => void;
  toggleLayer: (id: string) => void;
  deleteLayer: (id: string) => void;
  updateMap: (updates: Partial<MapData>) => void;
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
  const [activeColor, setActiveColor] = useState("#1a1a1a");
  const [activeOpacity, setActiveOpacity] = useState(1);
  const [activeLayerId, setActiveLayerId] = useState(DEFAULT_LAYER.id);
  const [activeShape, setActiveShape] = useState<PointShape>("circle");
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null
  );

  const selectedFeature = useMemo(
    () => features.find((f) => f.id === selectedFeatureId) ?? null,
    [features, selectedFeatureId]
  );

  const addFeature = useCallback(
    (geometry: GeoJSON.Geometry) => {
      const isPoint = geometryTypeToFeatureType(geometry.type) === "point";
      const newFeature: FeatureData = {
        id: uuid(),
        layerId: activeLayerId,
        type: geometryTypeToFeatureType(geometry.type),
        label: "",
        color: activeColor,
        opacity: activeOpacity,
        shape: isPoint ? (activeIcon ? undefined : activeShape) : undefined,
        icon: isPoint ? (activeIcon ?? undefined) : undefined,
        sourceText: "",
        geometry: JSON.stringify(geometry),
      };
      setFeatures((prev) => [...prev, newFeature]);
      setSelectedFeatureId(newFeature.id);
      setDrawMode("select");
    },
    [activeLayerId, activeColor, activeOpacity, activeShape, activeIcon]
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

  const value = useMemo<EditorContextValue>(
    () => ({
      map,
      layers,
      features,
      drawMode,
      activeColor,
      activeOpacity,
      activeLayerId,
      activeShape,
      activeIcon,
      selectedFeature,
      setDrawMode,
      setActiveColor,
      setActiveOpacity,
      setActiveLayerId,
      setActiveShape,
      setActiveIcon,
      selectFeature,
      addFeature,
      updateFeature,
      deleteFeature,
      addLayer,
      toggleLayer,
      deleteLayer,
      updateMap,
    }),
    [
      map,
      layers,
      features,
      drawMode,
      activeColor,
      activeOpacity,
      activeLayerId,
      activeShape,
      activeIcon,
      selectedFeature,
      selectFeature,
      addFeature,
      updateFeature,
      deleteFeature,
      addLayer,
      toggleLayer,
      deleteLayer,
      updateMap,
    ]
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}
