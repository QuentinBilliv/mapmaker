"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaMagnifyingGlass } from "react-icons/fa6";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function GeoSearchButton() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={btnRef}
        variant={open ? "default" : "ghost"}
        size="icon"
        onClick={() => setOpen((v) => !v)}
        title="Search location"
      >
        <FaMagnifyingGlass className="text-sm" />
      </Button>
      {open && <GeoSearchPopover anchorRef={btnRef} onClose={() => setOpen(false)} />}
    </>
  );
}

function GeoSearchPopover({ anchorRef, onClose }: { anchorRef: React.RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.right + 8 });
    }
    inputRef.current?.focus();
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const search = useCallback((q: string) => {
    clearTimeout(timerRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q.trim())}`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en" },
        });
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResult[] = await res.json();
        setResults(data);
        setShowResults(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const selectResult = (r: SearchResult) => {
    const center: [number, number] = [parseFloat(r.lon), parseFloat(r.lat)];
    window.dispatchEvent(
      new CustomEvent("mapmaker:flyto", { detail: { center, zoom: 12 } })
    );
    onClose();
  };

  return (
    <div ref={containerRef} className="fixed z-50 w-72" style={{ top: pos.top, left: pos.left }}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) selectResult(results[0]);
            if (e.key === "Escape") onClose();
          }}
          className="bg-background shadow-md text-sm h-8"
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">...</span>
        )}
      </div>
      {showResults && results.length > 0 && (
        <div className="mt-1 bg-popover rounded-md shadow-lg border overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent truncate"
              onClick={() => selectResult(r)}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
