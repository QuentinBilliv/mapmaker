"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function AccountPage() {
  const me = useQuery(api.users.getMe);
  const maps = useQuery(api.maps.getMyMaps);
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
              <Input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="text-lg font-semibold h-auto py-0.5 w-48"
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
      </div>
      <Link href="/dashboard" className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3">
        See my maps ({maps?.length ?? 0})
      </Link>
    </div>
  );
}
