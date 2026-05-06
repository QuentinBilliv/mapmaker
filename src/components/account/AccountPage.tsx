"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { TIER_LIMITS } from "@convex/shared";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Link from "next/link";

function cleanError(err: Error): string {
  return err.message
    .replace(/^\[CONVEX[^\]]*]\s*/, "")
    .replace(/^Uncaught Error:\s*/, "");
}

export default function AccountPage() {
  const me = useQuery(api.users.getMe);
  const maps = useQuery(api.maps.getMyMaps);
  const updateName = useMutation(api.users.updateName);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const trimmed = nameValue.trim();
  const isUnchanged = trimmed === (me.name ?? "");

  const commitName = () => {
    updateName({ name: trimmed })
      .then(() => setEditingName(false))
      .catch((err: Error) => toast.error(cleanError(err)));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          {editingName ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!trimmed || isUnchanged) return;
                setConfirmOpen(true);
              }}
            >
              <Input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="text-lg font-semibold h-auto py-0.5 w-48"
                maxLength={50}
              />
              <Button type="submit" size="sm" className="text-xs" disabled={!trimmed || isUnchanged}>Save</Button>
              <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => { setNameValue(me.name ?? ""); setEditingName(false); }}>Cancel</Button>
            </form>
          ) : (
            <h1 className="text-lg font-semibold flex items-center gap-2">
              {me.name ?? "Account"}
              <button onClick={() => setEditingName(true)} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
            </h1>
          )}
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Change display name?"
            description={`This will rename you to "${trimmed}" on every one of your public maps. Continue?`}
            confirmLabel="Change name"
            confirmVariant="default"
            onConfirm={commitName}
          />
          <p className="text-xs text-muted-foreground">
            {me.email} — {me.tier} tier
            {me.universityLabel && ` — ${me.universityLabel}`}
          </p>
        </div>
      </div>
      <MapQuota count={maps?.length ?? 0} tier={me.tier ?? "free"} />
      <div className="mt-8 pt-6 border-t flex items-center gap-4">
        <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Terms of Service
        </Link>
        <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}

function MapQuota({ count, tier }: { count: number; tier: string }) {
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const isUnlimited = !Number.isFinite(limit);
  const ratio = isUnlimited ? 0 : Math.min(count / limit, 1);
  const barColor = ratio >= 0.95 ? "bg-destructive" : ratio >= 0.8 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-2 max-w-xs">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">
          {isUnlimited ? `${count} maps` : `${count} / ${limit} maps`}
        </span>
        {isUnlimited && <span className="text-xs text-muted-foreground">Unlimited</span>}
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
      >
        See my maps →
      </Link>
    </div>
  );
}
