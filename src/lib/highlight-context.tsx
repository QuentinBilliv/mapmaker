"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface HighlightState {
  hoveredLegendEntryId: string | null;
  setHoveredLegendEntryId: (id: string | null) => void;
}

const HighlightContext = createContext<HighlightState>({
  hoveredLegendEntryId: null,
  setHoveredLegendEntryId: () => {},
});

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [hoveredLegendEntryId, setRaw] = useState<string | null>(null);
  const setHoveredLegendEntryId = useCallback((id: string | null) => setRaw(id), []);
  return (
    <HighlightContext.Provider value={{ hoveredLegendEntryId, setHoveredLegendEntryId }}>
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlight() {
  return useContext(HighlightContext);
}
