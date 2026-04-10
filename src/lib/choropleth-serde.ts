import type { ChoroplethData } from "./types";

export type SerializedChoropleth = Omit<ChoroplethData, "assignments" | "values"> & {
  assignments: Array<[string, string]>;
  values: Array<[string, number]>;
};

export function serializeChoropleth(
  c: ChoroplethData | undefined,
): SerializedChoropleth | undefined {
  if (!c) return undefined;
  return {
    ...c,
    assignments: Object.entries(c.assignments),
    values: Object.entries(c.values),
  };
}

export function deserializeChoropleth(raw: unknown): ChoroplethData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<ChoroplethData> & { assignments?: unknown; values?: unknown };
  const assignments = Array.isArray(r.assignments)
    ? Object.fromEntries(r.assignments as Array<[string, string]>)
    : ((r.assignments as Record<string, string> | undefined) ?? {});
  const values = Array.isArray(r.values)
    ? Object.fromEntries(r.values as Array<[string, number]>)
    : ((r.values as Record<string, number> | undefined) ?? {});
  return { ...(r as ChoroplethData), assignments, values };
}
