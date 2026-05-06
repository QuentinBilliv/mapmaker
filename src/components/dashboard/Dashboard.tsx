"use client";

import { useEffect, useState } from "react";
import { useConvex, useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import toast from "react-hot-toast";
import Link from "next/link";
import { Star } from "lucide-react";
import MapCard from "@/components/maps/MapCard";
import NewMapDialog from "@/components/dashboard/NewMapDialog";

type Stats = Record<string, { viewCount: number; starCount: number; isStarredByMe: boolean }>;

export default function Dashboard() {
  const convex = useConvex();
  const me = useQuery(api.users.getMe);
  const maps = useQuery(api.maps.getMyMaps);
  const deleteMap = useMutation(api.maps.deleteMap);
  const setVisibility = useMutation(api.maps.setVisibility);
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

  const handleSetVisibility = (mapId: Id<"maps">, visibility: "private" | "unlisted" | "public") =>
    setVisibility({ mapId, visibility }).catch((err: Error) => {
      toast.error(err.message.replace(/^\[CONVEX[^\]]*]\s*/, "").replace(/^Uncaught Error:\s*/, ""));
    });

  if (!me || maps === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const limit = me.mapLimit;
  const atLimit = maps.length >= limit;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">
              Welcome back{me.name ? `, ${me.name}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground">
              {maps.length}/{limit === Infinity ? "∞" : limit} maps
            </p>
          </div>
          <Link
            href="/dashboard/starred"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border hover:bg-accent transition-colors"
          >
            <Star className="size-3.5" />
            Starred
          </Link>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Your maps
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((m) => {
              const s = stats[m._id];
              return (
                <MapCard
                  key={m._id}
                  id={m._id}
                  title={m.title}
                  description={m.description}
                  tags={m.tags}
                  updatedAt={m.updatedAt}
                  thumbnailId={m.thumbnailId}
                  href={`/maps/${m._id}/edit`}
                  visibility={m.visibility}
                  viewCount={s?.viewCount ?? 0}
                  starCount={s?.starCount ?? 0}
                  isStarredByMe={s?.isStarredByMe ?? false}
                  onSetVisibility={(v) => handleSetVisibility(m._id, v)}
                  onDelete={() => deleteMap({ mapId: m._id }).catch(console.error)}
                />
              );
            })}
            {!atLimit && <NewMapDialog />}
          </div>
        </div>
      </div>
    </div>
  );
}
