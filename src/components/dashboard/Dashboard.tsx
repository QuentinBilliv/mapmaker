"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import toast from "react-hot-toast";
import MapCard from "@/components/maps/MapCard";
import NewMapDialog from "@/components/dashboard/NewMapDialog";

export default function Dashboard() {
  const me = useQuery(api.users.getMe);
  const maps = useQuery(api.maps.getMyMaps);
  const deleteMap = useMutation(api.maps.deleteMap);
  const setVisibility = useMutation(api.maps.setVisibility);

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
        <div>
          <h1 className="text-lg font-semibold">
            Welcome back{me.name ? `, ${me.name}` : ""}
          </h1>
          <p className="text-xs text-muted-foreground">
            {maps.length}/{limit === Infinity ? "∞" : limit} maps
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Your maps
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((m) => (
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
                onSetVisibility={(v) => handleSetVisibility(m._id, v)}
                onDelete={() => deleteMap({ mapId: m._id }).catch(console.error)}
              />
            ))}
            {!atLimit && <NewMapDialog />}
          </div>
        </div>
      </div>
    </div>
  );
}
