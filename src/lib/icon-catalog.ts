import { type IconType } from "react-icons";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export interface CatalogEntry {
  id: string;
  name: string;
  pack: string;
  Icon: IconType;
}

export interface IconPack {
  id: string;
  label: string;
  prefix: string;
  loader: () => Promise<Record<string, unknown>>;
}

async function safeImport(loader: () => Promise<Record<string, unknown>>): Promise<Record<string, unknown>> {
  try {
    return await loader();
  } catch {
    return {};
  }
}

const PACKS: IconPack[] = [
  { id: "fa6", label: "Font Awesome", prefix: "Fa", loader: () => safeImport(() => import("react-icons/fa6") as Promise<Record<string, unknown>>) },
  { id: "gi", label: "Game Icons", prefix: "Gi", loader: () => safeImport(() => import("react-icons/gi") as Promise<Record<string, unknown>>) },
  { id: "io5", label: "Ionicons", prefix: "Io", loader: () => safeImport(() => import("react-icons/io5") as Promise<Record<string, unknown>>) },
];

export { PACKS };

const _packCache = new Map<string, CatalogEntry[]>();
const _globalMap = new Map<string, CatalogEntry>();

function stripPrefix(id: string, prefix: string): string {
  return id.replace(new RegExp(`^${prefix}`), "").replace(/([A-Z])/g, " $1").trim();
}

export async function loadPack(packId: string): Promise<CatalogEntry[]> {
  const cached = _packCache.get(packId);
  if (cached) return cached;
  const pack = PACKS.find((p) => p.id === packId);
  if (!pack) return [];
  const mod = await pack.loader();
  const entries: CatalogEntry[] = Object.entries(mod)
    .filter(([key, val]) => key.startsWith(pack.prefix) && typeof val === "function")
    .map(([key, val]) => ({
      id: key,
      name: stripPrefix(key, pack.prefix),
      pack: pack.id,
      Icon: val as IconType,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  _packCache.set(packId, entries);
  for (const e of entries) _globalMap.set(e.id, e);
  return entries;
}

export async function loadAllPacks(): Promise<CatalogEntry[]> {
  const results = await Promise.all(PACKS.map((p) => loadPack(p.id)));
  return results.flat();
}

export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return _globalMap.get(id);
}

export async function loadCatalogEntry(id: string): Promise<CatalogEntry | undefined> {
  if (_globalMap.has(id)) return _globalMap.get(id);
  await loadAllPacks();
  return _globalMap.get(id);
}

export async function resolveIconToSvg(iconId: string): Promise<string | null> {
  const entry = await loadCatalogEntry(iconId);
  if (!entry) return null;
  return renderToStaticMarkup(createElement(entry.Icon, { size: 128 }));
}
