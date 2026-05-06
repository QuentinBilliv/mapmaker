"use client";

import { useEffect, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MapCard from "@/components/maps/MapCard";

type Stats = Record<string, { viewCount: number; starCount: number; isStarredByMe: boolean }>;

export default function StarredPage() {
  const convex = useConvex();
  const me = useQuery(api.users.getMe);
  const maps = useQuery(api.mapStats.getMyStarredMaps);
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    if (!maps || maps.length === 0) return;
    let cancelled = false;
    convex
      .query(api.mapStats.getStatsBatch, { mapIds: maps.map((m) => m._id) })
      .then((res) => { if (!cancelled) setStats(res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [convex, maps]);

  if (!me || maps === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" />
            Back to dashboard
          </Link>
          <h1 className="text-lg font-semibold">Starred maps</h1>
          <p className="text-xs text-muted-foreground">
            {maps.length} {maps.length === 1 ? "map" : "maps"}
          </p>
        </div>
        {maps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t starred any maps yet. Browse the{" "}
            <Link href="/maps" className="underline">public library</Link>
            {" "}to find some.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((m) => {
              const s = stats[m._id];
              const isOwn = m.ownerId === me._id;
              return (
                <MapCard
                  key={m._id}
                  id={m._id}
                  title={m.title}
                  description={m.description}
                  tags={m.tags}
                  updatedAt={m.updatedAt}
                  thumbnailId={m.thumbnailId}
                  ownerName={isOwn ? undefined : m.ownerName}
                  ownerId={isOwn ? undefined : (m.ownerId as Id<"users">)}
                  href={isOwn ? `/maps/${m._id}/edit` : `/maps/${m._id}`}
                  viewCount={s?.viewCount ?? 0}
                  starCount={s?.starCount ?? 0}
                  isStarredByMe={s?.isStarredByMe ?? true}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
