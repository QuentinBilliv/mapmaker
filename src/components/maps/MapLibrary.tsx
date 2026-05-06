"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import MapCard from "./MapCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type BrowseMap = FunctionReturnType<typeof api.maps.browsePublicMaps>["page"][number];
type SearchMap = FunctionReturnType<typeof api.maps.searchPublicMaps>[number];
type LibraryMap = BrowseMap | SearchMap;
type Stats = Record<string, { viewCount: number; starCount: number; isStarredByMe: boolean }>;

const PAGE_SIZE = 9;

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function MapLibrary() {
  const convex = useConvex();
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<Id<"users"> | undefined>();
  const [ownerNameFilter, setOwnerNameFilter] = useState("");
  const [sort, setSort] = useState<"recent" | "top">("recent");

  const [maps, setMaps] = useState<LibraryMap[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isExhausted, setIsExhausted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [stats, setStats] = useState<Stats>({});

  const debouncedSearch = useDebounce(search, 300);
  const isSearching = debouncedSearch.length > 0;

  const fetchStats = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const res = await convex.query(api.mapStats.getStatsBatch, {
      mapIds: ids as Id<"maps">[],
    });
    setStats((prev) => ({ ...prev, ...res }));
  }, [convex]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setMaps([]);
    setCursor(null);
    setIsExhausted(false);

    const run = async () => {
      try {
        if (isSearching) {
          const results = await convex.query(api.maps.searchPublicMaps, {
            query: debouncedSearch,
            ownerId: ownerFilter,
          });
          if (cancelled) return;
          setMaps(results);
          setIsExhausted(true);
          await fetchStats(results.map((m) => m._id));
        } else {
          const result = await convex.query(api.maps.browsePublicMaps, {
            paginationOpts: { numItems: PAGE_SIZE, cursor: null },
            ownerId: ownerFilter,
            sort,
          });
          if (cancelled) return;
          setMaps(result.page);
          setCursor(result.continueCursor);
          setIsExhausted(result.isDone);
          await fetchStats(result.page.map((m) => m._id));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [convex, debouncedSearch, isSearching, ownerFilter, sort, fetchStats]);

  const loadMore = async () => {
    if (isExhausted || cursor === null) return;
    setIsLoadingMore(true);
    try {
      const result = await convex.query(api.maps.browsePublicMaps, {
        paginationOpts: { numItems: PAGE_SIZE, cursor },
        ownerId: ownerFilter,
        sort,
      });
      setMaps((prev) => [...prev, ...result.page]);
      setCursor(result.continueCursor);
      setIsExhausted(result.isDone);
      await fetchStats(result.page.map((m) => m._id));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setOwnerFilter(undefined);
    setOwnerNameFilter("");
  };

  const hasFilters = search || ownerFilter;

  const visibleMaps = useMemo(() => maps, [maps]);

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-lg font-semibold">Public Maps</h1>
          <div className="flex items-center gap-2">
            {!isSearching && (
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "recent" | "top")}
                className="h-8 rounded-md border bg-transparent px-2 text-xs"
              >
                <option value="recent">Recent</option>
                <option value="top">Top starred</option>
              </select>
            )}
            <Input
              type="text"
              placeholder="Search by title, author or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 h-8"
            />
          </div>
        </div>
        {hasFilters && (
          <div className="flex items-center gap-2 mb-4 text-xs">
            <span className="text-muted-foreground">Filters:</span>
            {ownerFilter && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-foreground flex items-center gap-1">
                Author: {ownerNameFilter}
                <button onClick={() => { setOwnerFilter(undefined); setOwnerNameFilter(""); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </span>
            )}
            <button onClick={clearFilters} className="text-muted-foreground hover:text-foreground underline">
              Clear all
            </button>
          </div>
        )}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : visibleMaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{isSearching ? "No maps match your search." : "No public maps yet."}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleMaps.map((m) => {
                const s = stats[m._id];
                return (
                  <MapCard
                    key={m._id}
                    id={m._id}
                    title={m.title}
                    description={m.description}
                    tags={m.tags}
                    updatedAt={m.updatedAt}
                    ownerName={m.ownerName}
                    ownerId={m.ownerId}
                    universityLabel={m.universityLabel}
                    thumbnailId={m.thumbnailId}
                    viewCount={s?.viewCount ?? 0}
                    starCount={s?.starCount ?? 0}
                    isStarredByMe={s?.isStarredByMe ?? false}
                    onTagClick={(tag) => setSearch(tag)}
                    onAuthorClick={(id) => {
                      setOwnerFilter(id as Id<"users">);
                      setOwnerNameFilter(m.ownerName ?? "");
                    }}
                  />
                );
              })}
            </div>
            {!isSearching && !isExhausted && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
