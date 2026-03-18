"use client";

import Link from "next/link";
import { Trash2Icon } from "lucide-react";
import MapThumbnail from "./MapThumbnail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { Id } from "@convex/_generated/dataModel";

interface MapCardProps {
  id: string;
  title: string;
  description: string;
  tags: string[];
  updatedAt: number;
  href?: string;
  ownerName?: string;
  ownerId?: string;
  universityLabel?: string;
  thumbnailId?: Id<"_storage">;
  onTagClick?: (tag: string) => void;
  onAuthorClick?: (ownerId: string) => void;
  onDelete?: () => void;
}

export default function MapCard({
  id,
  title,
  description,
  tags,
  updatedAt,
  href,
  ownerName,
  ownerId,
  universityLabel,
  thumbnailId,
  onTagClick,
  onAuthorClick,
  onDelete,
}: MapCardProps) {
  const cardHref = href ?? `/maps/${id}`;

  return (
    <div className="relative border rounded-lg overflow-hidden hover:border-foreground/30 transition-colors">
      <Link href={cardHref}>
        <MapThumbnail storageId={thumbnailId} />
      </Link>
      <div className="p-4">
        <Link href={cardHref}>
          <h3 className="font-medium text-sm truncate">{title}</h3>
        </Link>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        )}
        {tags.length > 0 && (
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
        )}
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
      {onDelete && (
        <Dialog>
          <DialogTrigger>
            <span className="absolute bottom-3 right-3 text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
              <Trash2Icon className="size-3.5" />
            </span>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete map</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{title}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" size="sm" onClick={onDelete}>Delete</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
