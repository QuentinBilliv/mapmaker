export interface GeoBankCountry {
  iso: string;
  name: string;
  continent: string;
  subregion: string;
  admLevels: number[];
}

interface ApiResponse {
  boundaryName: string;
  boundaryISO: string;
  boundaryType: string;
  boundaryCanonical: string;
  Continent: string;
  "UNSDG-subregion": string;
  admUnitCount: string;
  simplifiedGeometryGeoJSON: string;
}

export interface GeoBankSubdivision {
  name: string;
  iso: string;
  id: string;
  geometry: GeoJSON.Geometry;
}

function proxy(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return `/api/geobank?${qs}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

let countriesCache: GeoBankCountry[] | null = null;
const geometryCache = new Map<string, GeoJSON.FeatureCollection>();

const MISSING_FROM_BULK: GeoBankCountry[] = [
  {
    iso: "IND",
    name: "India",
    continent: "Asia",
    subregion: "Southern Asia",
    admLevels: [0, 1, 2],
  },
];

export async function fetchCountries(): Promise<GeoBankCountry[]> {
  if (countriesCache) return countriesCache;

  const [adm0, adm1, adm2] = await Promise.all([
    fetchJson<ApiResponse[]>(proxy({ iso: "ALL", adm: "ADM0" })),
    fetchJson<ApiResponse[]>(proxy({ iso: "ALL", adm: "ADM1" })).catch(() => []),
    fetchJson<ApiResponse[]>(proxy({ iso: "ALL", adm: "ADM2" })).catch(() => []),
  ]);

  const adm1Set = new Set(adm1.map((e) => e.boundaryISO));
  const adm2Set = new Set(adm2.map((e) => e.boundaryISO));

  const fromBulk: GeoBankCountry[] = adm0.map((entry) => {
    const levels = [0];
    if (adm1Set.has(entry.boundaryISO)) levels.push(1);
    if (adm2Set.has(entry.boundaryISO)) levels.push(2);
    return {
      iso: entry.boundaryISO,
      name: entry.boundaryName,
      continent: entry.Continent,
      subregion: entry["UNSDG-subregion"],
      admLevels: levels,
    };
  });

  const seen = new Set(fromBulk.map((c) => c.iso));
  const merged = [...fromBulk, ...MISSING_FROM_BULK.filter((c) => !seen.has(c.iso))];
  merged.sort((a, b) => a.name.localeCompare(b.name));
  countriesCache = merged;
  return countriesCache;
}

export async function fetchBoundary(
  iso: string,
  admLevel: number
): Promise<{ geojson: GeoJSON.FeatureCollection; canonicalType: string }> {
  const cacheKey = `${iso}-ADM${admLevel}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) {
    return { geojson: cached, canonicalType: "" };
  }

  const meta = await fetchJson<ApiResponse>(
    proxy({ iso, adm: `ADM${admLevel}` })
  );

  const geojson = await fetchJson<GeoJSON.FeatureCollection>(
    proxy({ url: meta.simplifiedGeometryGeoJSON })
  );

  geometryCache.set(cacheKey, geojson);
  return { geojson, canonicalType: meta.boundaryCanonical };
}
