"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import MapCard from "./MapCard";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 9;

export default function MapLibrary() {
  const [tagFilter, setTagFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<Id<"users"> | undefined>();
  const [ownerNameFilter, setOwnerNameFilter] = useState("");
  const [page, setPage] = useState(1);

  const queryArgs: { tag?: string; ownerId?: Id<"users"> } = {};
  if (tagFilter) queryArgs.tag = tagFilter;
  if (ownerFilter) queryArgs.ownerId = ownerFilter;

  const maps = useQuery(api.maps.getPublicMaps, queryArgs);

  const clearFilters = () => {
    setTagFilter("");
    setOwnerFilter(undefined);
    setOwnerNameFilter("");
    setPage(1);
  };

  const hasFilters = tagFilter || ownerFilter;

  const totalPages = maps ? Math.ceil(maps.length / PAGE_SIZE) : 0;
  const paginatedMaps = maps?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));

  function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    if (current > 3) pages.push("ellipsis");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push("ellipsis");
    pages.push(total);
    return pages;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Public Maps</h1>
        <Input
          type="text"
          placeholder="Filter by tag..."
          value={tagFilter}
          onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
          className="w-48 h-8"
        />
      </div>
      {hasFilters && (
        <div className="flex items-center gap-2 mb-4 text-xs">
          <span className="text-muted-foreground">Filters:</span>
          {tagFilter && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground flex items-center gap-1">
              Tag: {tagFilter}
              <button onClick={() => { setTagFilter(""); setPage(1); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </span>
          )}
          {ownerFilter && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground flex items-center gap-1">
              Author: {ownerNameFilter}
              <button onClick={() => { setOwnerFilter(undefined); setOwnerNameFilter(""); setPage(1); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </span>
          )}
          <button onClick={clearFilters} className="text-muted-foreground hover:text-foreground underline">
            Clear all
          </button>
        </div>
      )}
      {maps === undefined ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : maps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public maps yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedMaps!.map((m: any) => (
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
                onTagClick={(tag) => { setTagFilter(tag); setPage(1); }}
                onAuthorClick={(id) => {
                  setOwnerFilter(id as Id<"users">);
                  setOwnerNameFilter(m.ownerName ?? "");
                  setPage(1);
                }}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => goToPage(page - 1)} disabled={page === 1} />
                </PaginationItem>
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`e-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink isActive={p === page} onClick={() => goToPage(p)}>
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext onClick={() => goToPage(page + 1)} disabled={page === totalPages} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
