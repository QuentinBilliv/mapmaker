import { useCallback } from "react";
import { v4 as uuid } from "uuid";
import type { FeatureData, ChoroplethData } from "../types";

interface Deps {
  setFeatures: React.Dispatch<React.SetStateAction<FeatureData[]>>;
  setChoroplethState: React.Dispatch<React.SetStateAction<ChoroplethData>>;
  recordSnapshot: () => void;
}

export function useChoroplethActions({
  setFeatures,
  setChoroplethState,
  recordSnapshot,
}: Deps) {
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
  }, [recordSnapshot, setChoroplethState, setFeatures]);

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
  }, [recordSnapshot, setChoroplethState]);

  const updateChoroplethCategory = useCallback((id: string, updates: Partial<{ color: string; label: string }>) => {
    recordSnapshot();
    setChoroplethState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => c.id === id ? { ...c, ...updates } : c),
    }));
  }, [recordSnapshot, setChoroplethState]);

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
      const descriptions = { ...prev.descriptions };
      const imageUrls = { ...prev.imageUrls };
      for (const iso of Object.keys(assignments)) {
        if (assignments[iso] === id) {
          delete assignments[iso];
          delete descriptions[iso];
          delete imageUrls[iso];
        }
      }
      return {
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        assignments,
        descriptions,
        imageUrls,
        activeCategoryId: prev.activeCategoryId === id ? null : prev.activeCategoryId,
      };
    });
  }, [recordSnapshot, setChoroplethState, setFeatures]);

  const assignCountryToCategory = useCallback((iso: string, _name: string) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      if (!prev.activeCategoryId) return prev;
      return { ...prev, assignments: { ...prev.assignments, [iso]: prev.activeCategoryId } };
    });
  }, [recordSnapshot, setChoroplethState]);

  const unassignCountry = useCallback((iso: string) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      const assignments = { ...prev.assignments };
      delete assignments[iso];
      const descriptions = { ...prev.descriptions };
      delete descriptions[iso];
      const imageUrls = { ...prev.imageUrls };
      delete imageUrls[iso];
      return { ...prev, assignments, descriptions, imageUrls };
    });
  }, [recordSnapshot, setChoroplethState]);

  const setCountryDetails = useCallback((iso: string, updates: { description?: string; imageUrl?: string }) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      const descriptions = { ...prev.descriptions };
      const imageUrls = { ...prev.imageUrls };
      if (updates.description !== undefined) {
        const trimmed = updates.description.trim();
        if (trimmed) descriptions[iso] = trimmed.slice(0, 500);
        else delete descriptions[iso];
      }
      if (updates.imageUrl !== undefined) {
        const trimmed = updates.imageUrl.trim();
        if (trimmed) imageUrls[iso] = trimmed.slice(0, 500);
        else delete imageUrls[iso];
      }
      return { ...prev, descriptions, imageUrls };
    });
  }, [recordSnapshot, setChoroplethState]);

  const importChoroplethData = useCallback((data: { categories: { label: string; color: string; countries: string[] }[]; descriptions: Record<string, string>; imageUrls: Record<string, string> }) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      const newCategories = [...prev.categories];
      const newAssignments = { ...prev.assignments };
      let maxOrder = newCategories.reduce((m, c) => Math.max(m, c.order), -1);
      for (const item of data.categories) {
        const id = uuid();
        newCategories.push({ id, color: item.color, label: item.label, order: ++maxOrder });
        for (const iso of item.countries) {
          newAssignments[iso] = id;
        }
      }
      return {
        ...prev,
        categories: newCategories,
        assignments: newAssignments,
        descriptions: { ...prev.descriptions, ...data.descriptions },
        imageUrls: { ...prev.imageUrls, ...data.imageUrls },
        enabled: true,
      };
    });
  }, [recordSnapshot, setChoroplethState]);

  const setGradientValue = useCallback((iso: string, value: number) => {
    recordSnapshot();
    setChoroplethState((prev) => ({
      ...prev,
      values: { ...prev.values, [iso]: value },
    }));
  }, [recordSnapshot, setChoroplethState]);

  const removeGradientValue = useCallback((iso: string) => {
    recordSnapshot();
    setChoroplethState((prev) => {
      const values = { ...prev.values };
      delete values[iso];
      return { ...prev, values };
    });
  }, [recordSnapshot, setChoroplethState]);

  const importGradientData = useCallback((data: Record<string, number>) => {
    recordSnapshot();
    setChoroplethState((prev) => ({
      ...prev,
      values: { ...prev.values, ...data },
      enabled: true,
      mode: "gradient",
    }));
  }, [recordSnapshot, setChoroplethState]);

  return {
    setChoropleth,
    addChoroplethCategory, updateChoroplethCategory, deleteChoroplethCategory,
    assignChoroplethCategory,
    assignCountryToCategory, unassignCountry, setCountryDetails, importChoroplethData,
    setGradientValue, removeGradientValue, importGradientData,
  };
}
