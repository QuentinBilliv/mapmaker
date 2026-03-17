"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@convex/_generated/dataModel";

export default function Dashboard() {
  const me = useQuery(api.users.getMe);
  const maps = useQuery(api.maps.getMyMaps);
  const createMap = useMutation(api.maps.createMap);
  const router = useRouter();

  if (!me || maps === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const lastMap = maps[0];
  const recentMaps = maps.slice(1, 5);
  const limit = me.mapLimit;
  const atLimit = maps.length >= limit;

  async function handleNewMap() {
    try {
      const id = await createMap();
      router.push(`/maps/${id}/edit`);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-lg font-semibold">
            Welcome back{me.name ? `, ${me.name}` : ""}
          </h1>
          <p className="text-xs text-muted-foreground">
            {maps.length}/{limit === Infinity ? "∞" : limit} maps
          </p>
        </div>
        {lastMap ? (
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Last edited
            </p>
            <button
              onClick={() => router.push(`/maps/${lastMap._id}/edit`)}
              className="w-full text-left group"
            >
              <p className="text-sm font-medium group-hover:underline truncate">
                {lastMap.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(lastMap.updatedAt).toLocaleDateString()}
              </p>
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No maps yet. Create your first one.</p>
        )}
        {recentMaps.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Recent maps
            </p>
            {recentMaps.map((m: any) => (
              <button
                key={m._id}
                onClick={() => router.push(`/maps/${m._id as Id<"maps">}/edit`)}
                className="w-full flex items-center justify-between py-1.5 text-left hover:bg-muted/50 rounded px-2 -mx-2"
              >
                <span className="text-sm truncate">{m.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                  {new Date(m.updatedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" disabled={atLimit} onClick={handleNewMap}>
            {atLimit ? `Limit reached (${limit})` : "New map"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/maps")}>
            All maps
          </Button>
        </div>
      </div>
    </div>
  );
}
