"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";

export default function AdminPage() {
  const reports = useQuery(api.admin.listReports);
  const unpublish = useMutation(api.admin.unpublishMap);
  const resolve = useMutation(api.admin.resolveReport);

  if (reports === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (reports === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-destructive">Access denied</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">Reports</h1>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending reports.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r._id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/maps/${r.mapId}`}
                    target="_blank"
                    className="font-medium text-sm hover:underline"
                  >
                    {r.mapTitle}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by {r.mapOwnerName} &middot; {r.mapVisibility} &middot; {r.reason}
                  </p>
                  {r.details && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      &ldquo;{r.details}&rdquo;
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      await unpublish({ mapId: r.mapId });
                      await resolve({ reportId: r._id as Id<"reports"> });
                    }}
                    className="text-xs px-3 py-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    Unpublish
                  </button>
                  <button
                    onClick={() => resolve({ reportId: r._id as Id<"reports"> })}
                    className="text-xs px-3 py-1 rounded border hover:bg-muted transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
