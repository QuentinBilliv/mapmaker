import { GenericDatabaseWriter } from "convex/server";
import { DataModel } from "./_generated/dataModel";

export async function patchDefined(
  db: GenericDatabaseWriter<DataModel>,
  id: Parameters<GenericDatabaseWriter<DataModel>["patch"]>[0],
  fields: Record<string, unknown>
) {
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) updates[key] = value;
  }
  if (Object.keys(updates).length > 0) {
    await (db as any).patch(id, updates);
  }
}
