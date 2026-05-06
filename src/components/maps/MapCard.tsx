"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { XIcon, LockIcon, LinkIcon, GlobeIcon, ChevronDownIcon, Share2Icon, CheckIcon, EyeIcon, PencilIcon } from "lucide-react";
import MapThumbnail from "./MapThumbnail";
import StarButton from "./StarButton";
import { Button } from "@/components/ui/button";

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "") + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}
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

type Visibility = "private" | "unlisted" | "public";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; description: string; icon: typeof LockIcon; badge: string }[] = [
  { value: "private", label: "Private", description: "Only you can access this map.", icon: LockIcon, badge: "bg-zinc-100 text-zinc-600" },
  { value: "unlisted", label: "Unlisted", description: "Anyone with the link can view this map.", icon: LinkIcon, badge: "bg-blue-50 text-blue-600" },
  { value: "public", label: "Public", description: "Listed in the public library for everyone to discover.", icon: GlobeIcon, badge: "bg-emerald-50 text-emerald-600" },
];

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
  visibility?: Visibility;
  onSetVisibility?: (visibility: Visibility) => void;
  viewCount?: number;
  starCount?: number;
  isStarredByMe?: boolean;
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
  visibility,
  onSetVisibility,
  viewCount,
  starCount,
  isStarredByMe,
}: MapCardProps) {
  const cardHref = href ?? `/maps/${id}`;

  return (
    <div className="group relative border rounded-lg overflow-hidden hover:border-foreground/30 transition-colors">
      <Link href={cardHref}>
        <MapThumbnail storageId={thumbnailId} />
      </Link>
      <div className="px-4 pt-3">
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
          {ownerId && (
            <button
              onClick={() => onAuthorClick?.(ownerId)}
              className="hover:text-foreground transition-colors"
            >
              {ownerName || "Anonymous"}
              {universityLabel && (
                <span className="ml-1 px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px]">
                  {universityLabel}
                </span>
              )}
            </button>
          )}
          <span>{new Date(updatedAt).toLocaleDateString()}</span>
          {onSetVisibility && visibility && (() => {
            const opt = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!;
            return (
              <Dialog>
                <DialogTrigger asChild>
                  <button className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-opacity hover:opacity-80 ${opt.badge}`}>
                    <opt.icon className="size-3" />
                    {opt.label}
                    <ChevronDownIcon className="size-2.5" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Visibility</DialogTitle>
                    <DialogDescription>
                      Choose who can access &quot;{title}&quot;.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1 mt-2">
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <DialogClose key={opt.value} asChild>
                        <button
                          onClick={() => onSetVisibility(opt.value)}
                          className={`w-full flex items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${visibility === opt.value ? "bg-muted" : "hover:bg-muted/50"}`}
                        >
                          <opt.icon className="size-4 mt-0.5 shrink-0" />
                          <div>
                            <p className={`text-sm font-medium ${visibility === opt.value ? "text-foreground" : ""}`}>{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.description}</p>
                          </div>
                        </button>
                      </DialogClose>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            );
          })()}
          {visibility !== "private" && (
            <ShareButton mapId={id} />
          )}
        </div>
        {(viewCount !== undefined || starCount !== undefined) && (
          <div className="flex items-center justify-between mt-2 mb-4 text-[10px] text-muted-foreground">
            {viewCount !== undefined ? (
              <span className="inline-flex items-center gap-1" title={`${viewCount} views`}>
                <EyeIcon className="size-3" />
                {formatCount(viewCount)}
              </span>
            ) : <span />}
            {starCount !== undefined && (
              <StarButton
                mapId={id}
                starred={isStarredByMe ?? false}
                count={starCount}
                size="sm"
              />
            )}
          </div>
        )}
      </div>
      {onDelete && (
        <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Link
            href={`/maps/${id}`}
            title="View"
            className="size-6 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center"
          >
            <EyeIcon className="size-3.5" />
          </Link>
          <Link
            href={cardHref}
            title="Edit"
            className="size-6 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center"
          >
            <PencilIcon className="size-3.5" />
          </Link>
          <Dialog>
            <DialogTrigger asChild>
              <button title="Delete" className="size-6 rounded-full bg-destructive/40 hover:bg-destructive/70 text-white flex items-center justify-center cursor-pointer">
                <XIcon className="size-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete map</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete &quot;{title}&quot;? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive" size="sm" onClick={onDelete}>
                    Delete
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

function ShareButton({ mapId }: { mapId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const url = `${window.location.origin}/maps/${mapId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mapId]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <CheckIcon className="size-3" /> : <Share2Icon className="size-3" />}
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
