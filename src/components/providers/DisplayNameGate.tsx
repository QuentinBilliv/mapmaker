"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Field from "@/components/ui/Field";

function cleanError(err: Error): string {
  return err.message
    .replace(/^\[CONVEX[^\]]*]\s*/, "")
    .replace(/^Uncaught Error:\s*/, "");
}

export default function DisplayNameGate() {
  const me = useQuery(api.users.getMe);
  const updateName = useMutation(api.users.updateName);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me) return null;
  if (me.name && me.name.trim().length > 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setSaving(true);
    try {
      await updateName({ name: trimmed });
    } catch (err) {
      setError(cleanError(err as Error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-lg bg-popover border shadow-lg p-5 space-y-3">
        <h2 className="text-base font-semibold">Pick a display name</h2>
        <p className="text-xs text-muted-foreground">
          This will appear on your public maps and next to your maps in the public library. You can change it later in your account settings.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Display name" required error={error ?? undefined}>
            <Input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
              placeholder="e.g. mapmaker42"
              maxLength={50}
              autoFocus
            />
          </Field>
          <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </form>
      </div>
    </div>
  );
}
