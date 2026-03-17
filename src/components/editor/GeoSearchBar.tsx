"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { FaMagnifyingGlass } from "react-icons/fa6";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function GeoSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q: string) => {
    clearTimeout(timerRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q.trim())}`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en" },
        });
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
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
    setQuery(r.display_name.split(",")[0]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-72">
      <div className="relative">
        <FaMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
        <Input
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) selectResult(results[0]);
            if (e.key === "Escape") { setOpen(false); (e.target as HTMLInputElement).blur(); }
          }}
          className="pl-8 bg-background/90 backdrop-blur-sm shadow-md text-sm h-8"
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">...</span>
        )}
      </div>
      {open && results.length > 0 && (
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
