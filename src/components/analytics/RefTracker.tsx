"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

const ALLOWED = new Set(["shared", "embed"]);
export const REF_STORAGE_KEY = "idomaps:ref";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function consumeStoredRef(): string | null {
  try {
    const raw = localStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(REF_STORAGE_KEY);
    const { ref, t } = JSON.parse(raw) as { ref?: string; t?: number };
    if (!ref || !ALLOWED.has(ref)) return null;
    if (typeof t === "number" && Date.now() - t > MAX_AGE_MS) return null;
    return ref;
  } catch {
    return null;
  }
}

export default function RefTracker() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref || !ALLOWED.has(ref)) return;
    track("ref_visit", { ref });
    try {
      localStorage.setItem(
        REF_STORAGE_KEY,
        JSON.stringify({ ref, t: Date.now() }),
      );
    } catch {
      // localStorage unavailable — the visit event is still recorded
    }
  }, []);

  return null;
}
