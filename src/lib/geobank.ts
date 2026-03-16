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

let countriesCache: GeoBankCountry[] | null = null;
const geometryCache = new Map<string, GeoJSON.FeatureCollection>();

export async function fetchCountries(): Promise<GeoBankCountry[]> {
  if (countriesCache) return countriesCache;

  const [adm0, adm1, adm2] = await Promise.all([
    fetch(proxy({ iso: "ALL", adm: "ADM0" })).then((r) => r.json()) as Promise<ApiResponse[]>,
    fetch(proxy({ iso: "ALL", adm: "ADM1" })).then((r) => r.json()).catch(() => []) as Promise<ApiResponse[]>,
    fetch(proxy({ iso: "ALL", adm: "ADM2" })).then((r) => r.json()).catch(() => []) as Promise<ApiResponse[]>,
  ]);

  const adm1Set = new Set(adm1.map((e) => e.boundaryISO));
  const adm2Set = new Set(adm2.map((e) => e.boundaryISO));

  countriesCache = adm0.map((entry) => {
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

  countriesCache.sort((a, b) => a.name.localeCompare(b.name));
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

  const meta: ApiResponse = await fetch(
    proxy({ iso, adm: `ADM${admLevel}` })
  ).then((r) => r.json());

  const geojson: GeoJSON.FeatureCollection = await fetch(
    proxy({ url: meta.simplifiedGeometryGeoJSON })
  ).then((r) => r.json());

  geometryCache.set(cacheKey, geojson);
  return { geojson, canonicalType: meta.boundaryCanonical };
}
