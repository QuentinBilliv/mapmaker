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
      {url && (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
