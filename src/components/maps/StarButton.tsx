"use client";

import { useState } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Star } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface StarButtonProps {
  mapId: string;
  starred: boolean;
  count: number;
  onChange?: (next: { starred: boolean; count: number }) => void;
  className?: string;
  size?: "sm" | "md";
}

export default function StarButton({ mapId, starred, count, onChange, className, size = "md" }: StarButtonProps) {
  const { isAuthenticated } = useConvexAuth();
  const toggleStar = useMutation(api.mapStats.toggleStar);
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<{ starred: boolean; count: number } | null>(null);
  const [pending, setPending] = useState(false);

  const display = optimistic ?? { starred, count };
  const iconSize = size === "sm" ? "size-3" : "size-4";

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      toast("Sign in to star this map", { icon: "⭐" });
      router.push("/login");
      return;
    }
    if (pending) return;
    const next = {
      starred: !display.starred,
      count: Math.max(0, display.count + (display.starred ? -1 : 1)),
    };
    setOptimistic(next);
    setPending(true);
    try {
      const result = await toggleStar({ mapId: mapId as Id<"maps"> });
      const finalCount = Math.max(0, count + (result.starred ? 1 : 0) - (starred ? 1 : 0));
      const finalState = { starred: result.starred, count: finalCount };
      setOptimistic(finalState);
      onChange?.(finalState);
    } catch (err) {
      setOptimistic(null);
      toast.error((err as Error).message.replace(/^\[CONVEX[^\]]*]\s*/, ""));
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={display.starred ? "Unstar this map" : "Star this map"}
      title={display.starred ? "Unstar" : "Star"}
      className={`inline-flex items-center gap-1 rounded transition-colors px-1 py-0.5 -mx-1 -my-0.5 ${
        display.starred
          ? "text-amber-600 hover:text-amber-700"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      } ${className ?? ""}`}
    >
      <Star className={`${iconSize} ${display.starred ? "fill-amber-500 text-amber-500" : ""}`} />
      {display.count}
    </button>
  );
}
