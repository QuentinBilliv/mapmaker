"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { PlusIcon } from "lucide-react";
import MapCard from "@/components/maps/MapCard";

export default function Dashboard() {
  const me = useQuery(api.users.getMe);
  const maps = useQuery(api.maps.getMyMaps);
  const createMap = useMutation(api.maps.createMap);
  const deleteMap = useMutation(api.maps.deleteMap);
  const router = useRouter();

  if (!me || maps === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
    <div className="flex-1 p-6">
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
            {maps.slice(0, 5).map((m: any) => (
              <MapCard
                key={m._id}
                id={m._id}
                title={m.title}
                description={m.description}
                tags={m.tags}
                updatedAt={m.updatedAt}
                thumbnailId={m.thumbnailId}
                href={`/maps/${m._id}/edit`}
                onDelete={() => deleteMap({ mapId: m._id }).catch(console.error)}
              />
            ))}
            {!atLimit && (
              <button
                onClick={handleNewMap}
                className="border border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors min-h-[200px]"
              >
                <PlusIcon className="size-8" />
                <span className="text-sm font-medium">New map</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
