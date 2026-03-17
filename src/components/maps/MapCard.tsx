"use client";

import Link from "next/link";

interface MapCardProps {
  id: string;
  title: string;
  description: string;
  tags: string[];
  updatedAt: number;
  ownerName?: string;
  universityLabel?: string;
}

export default function MapCard({
  id,
  title,
  description,
  tags,
  updatedAt,
  ownerName,
  universityLabel,
}: MapCardProps) {
  return (
    <Link
      href={`/maps/${id}`}
      className="block border rounded-lg p-4 hover:border-foreground/30 transition-colors"
    >
      <h3 className="font-medium text-sm truncate">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {description}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
        {ownerName && (
          <span>
            {ownerName}
            {universityLabel && (
              <span className="ml-1 px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px]">
                {universityLabel}
              </span>
            )}
          </span>
        )}
        <span>{new Date(updatedAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}
