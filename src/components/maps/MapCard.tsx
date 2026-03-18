"use client";

import Link from "next/link";
import MapThumbnail from "./MapThumbnail";
import type { Id } from "@convex/_generated/dataModel";

interface MapCardProps {
  id: string;
  title: string;
  description: string;
  tags: string[];
  updatedAt: number;
  ownerName?: string;
  ownerId?: string;
  universityLabel?: string;
  thumbnailId?: Id<"_storage">;
  onTagClick?: (tag: string) => void;
  onAuthorClick?: (ownerId: string) => void;
}

export default function MapCard({
  id,
  title,
  description,
  tags,
  updatedAt,
  ownerName,
  ownerId,
  universityLabel,
  thumbnailId,
  onTagClick,
  onAuthorClick,
}: MapCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden hover:border-foreground/30 transition-colors">
      <Link href={`/maps/${id}`}>
        <MapThumbnail storageId={thumbnailId} />
      </Link>
      <div className="p-4">
        <Link href={`/maps/${id}`}>
          <h3 className="font-medium text-sm truncate">{title}</h3>
        </Link>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {tags.slice(0, 3).map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
          {ownerName && ownerId && (
            <button
              onClick={() => onAuthorClick?.(ownerId)}
              className="hover:text-foreground transition-colors"
            >
              {ownerName}
              {universityLabel && (
                <span className="ml-1 px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px]">
                  {universityLabel}
                </span>
              )}
            </button>
          )}
          <span>{new Date(updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
