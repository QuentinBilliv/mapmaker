"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import MapCard from "./MapCard";

export default function MapLibrary() {
  const [tagFilter, setTagFilter] = useState("");
  const maps = useQuery(api.maps.getPublicMaps, tagFilter ? { tag: tagFilter } : {});

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Public Maps</h1>
        <input
          type="text"
          placeholder="Filter by tag..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="text-sm border rounded px-2 py-1 w-48 bg-background"
        />
      </div>
      {maps === undefined ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : maps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public maps yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((m: any) => (
            <MapCard
              key={m._id}
              id={m._id}
              title={m.title}
              description={m.description}
              tags={m.tags}
              updatedAt={m.updatedAt}
              thumbnailId={m.thumbnailId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
