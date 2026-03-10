import { type IconType } from "react-icons";

export interface CatalogEntry {
  id: string;
  name: string;
  Icon: IconType;
}

let _cache: CatalogEntry[] | null = null;
let _map: Map<string, CatalogEntry> | null = null;

function pascalToReadable(id: string): string {
  return id.replace(/^Fa/, "").replace(/([A-Z])/g, " $1").trim();
}

export async function loadCatalog(): Promise<CatalogEntry[]> {
  if (_cache) return _cache;
  const mod = await import("react-icons/fa6");
  _cache = Object.entries(mod)
    .filter(([key, val]) => key.startsWith("Fa") && typeof val === "function")
    .map(([key, val]) => ({
      id: key,
      name: pascalToReadable(key),
      Icon: val as IconType,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  _map = new Map(_cache.map((e) => [e.id, e]));
  return _cache;
}

export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return _map?.get(id);
}

export async function loadCatalogEntry(id: string): Promise<CatalogEntry | undefined> {
  if (!_map) await loadCatalog();
  return _map?.get(id);
}
