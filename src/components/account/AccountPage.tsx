"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Id } from "@convex/_generated/dataModel";

export default function AccountPage() {
  const me = useQuery(api.users.getMe);
  const maps = useQuery(api.maps.getMyMaps);
  const createMap = useMutation(api.maps.createMap);
  const deleteMap = useMutation(api.maps.deleteMap);
  const toggleVisibility = useMutation(api.maps.toggleVisibility);
  const updateName = useMutation(api.users.updateName);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  useEffect(() => {
    if (me?.name) setNameValue(me.name);
  }, [me?.name]);

  if (!me || maps === undefined) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const limit = me.mapLimit;
  const atLimit = maps.length >= limit;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          {editingName ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                updateName({ name: nameValue })
                  .then(() => setEditingName(false))
                  .catch(console.error);
              }}
            >
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="text-lg font-semibold border-b bg-transparent outline-none w-48"
                maxLength={50}
              />
              <Button type="submit" size="sm" className="text-xs">Save</Button>
              <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => { setNameValue(me.name ?? ""); setEditingName(false); }}>Cancel</Button>
            </form>
          ) : (
            <h1 className="text-lg font-semibold flex items-center gap-2">
              {me.name ?? "Account"}
              <button onClick={() => setEditingName(true)} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
            </h1>
          )}
          <p className="text-xs text-muted-foreground">
            {me.email} — {me.tier} tier
            {me.universityLabel && ` — ${me.universityLabel}`}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {maps.length}/{limit === Infinity ? "∞" : limit} maps
        </p>
      </div>
      <div className="mb-4">
        <Button
          size="sm"
          disabled={atLimit}
          onClick={() => createMap().catch(console.error)}
        >
          {atLimit ? `Limit reached (${limit})` : "New map"}
        </Button>
      </div>
      {maps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No maps yet.</p>
      ) : (
        <div className="space-y-2">
          {maps.map((m: any) => (
            <div
              key={m._id}
              className="flex items-center gap-3 border rounded px-3 py-2"
            >
              <Link
                href={`/maps/${m._id}/edit`}
                className="flex-1 text-sm font-medium hover:underline truncate"
              >
                {m.title}
              </Link>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(m.updatedAt).toLocaleDateString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs shrink-0"
                onClick={() =>
                  toggleVisibility({
                    mapId: m._id as Id<"maps">,
                  }).catch(console.error)
                }
              >
                {m.isPublic ? "Public" : "Private"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive shrink-0"
                onClick={() => {
                  if (!confirm("Delete this map?")) return;
                  deleteMap({ mapId: m._id as Id<"maps"> }).catch(
                    console.error
                  );
                }}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
