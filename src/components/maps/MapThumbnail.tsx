"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface MapThumbnailProps {
  storageId?: Id<"_storage">;
}

export default function MapThumbnail({ storageId }: MapThumbnailProps) {
  const url = useQuery(
    api.maps.getThumbnailUrl,
    storageId ? { storageId } : "skip"
  );

  return (
    <div className="w-full aspect-[16/9] bg-muted">
      {url ? (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      )}
    </div>
  );
}
