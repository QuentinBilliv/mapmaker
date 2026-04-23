"use client";

import { useState, useEffect } from "react";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import MapCard from "./MapCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<Id<"users"> | undefined>();
  const [ownerNameFilter, setOwnerNameFilter] = useState("");

  const debouncedSearch = useDebounce(search, 300);
  const isSearching = debouncedSearch.length > 0;

  const browseResult = usePaginatedQuery(
    api.maps.browsePublicMaps,
    isSearching ? "skip" : { ownerId: ownerFilter },
    { initialNumItems: PAGE_SIZE }
  );

  const searchResults = useQuery(
    api.maps.searchPublicMaps,
    isSearching ? { query: debouncedSearch, ownerId: ownerFilter } : "skip"
  );

  const maps = isSearching ? searchResults : browseResult.results;
  const isLoading = isSearching
    ? searchResults === undefined
    : browseResult.status === "LoadingFirstPage";

  const clearFilters = () => {
    setSearch("");
    setOwnerFilter(undefined);
    setOwnerNameFilter("");
  };

  const hasFilters = search || ownerFilter;

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Public Maps</h1>
        <Input
          type="text"
          placeholder="Search by title, author or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 h-8"
        />
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
      ) : !maps || maps.length === 0 ? (
        <p className="text-sm text-muted-foreground">{isSearching ? "No maps match your search." : "No public maps yet."}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((m) => (
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
                onTagClick={(tag) => setSearch(tag)}
                onAuthorClick={(id) => {
                  setOwnerFilter(id as Id<"users">);
                  setOwnerNameFilter(m.ownerName ?? "");
                }}
              />
            ))}
          </div>
          {!isSearching && browseResult.status !== "Exhausted" && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => browseResult.loadMore(PAGE_SIZE)}
                disabled={browseResult.isLoading}
              >
                {browseResult.isLoading ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
