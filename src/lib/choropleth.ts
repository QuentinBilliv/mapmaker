import type { ChoroplethEntry } from "./types";

let cache: GeoJSON.FeatureCollection | null = null;

export async function loadCountriesGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  if (cache) return cache;
  const res = await fetch("/geo/countries-50m.geojson");
  cache = await res.json();
  return cache!;
}

export interface CountryInfo {
  iso: string;
  name: string;
}

export function getCountryList(geojson: GeoJSON.FeatureCollection): CountryInfo[] {
  return geojson.features
    .map((f) => ({
      iso: f.properties?.iso_a3 as string,
      name: f.properties?.name as string,
    }))
    .filter((c) => c.iso && c.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildChoroplethGeoJSON(
  countries: GeoJSON.FeatureCollection,
  entries: Record<string, ChoroplethEntry>,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: countries.features.map((f) => {
      const iso = f.properties?.iso_a3 as string;
      const entry = iso ? entries[iso] : undefined;
      return {
        ...f,
        properties: {
          ...f.properties,
          _color: entry?.color ?? "rgba(0,0,0,0)",
          _painted: entry ? 1 : 0,
        },
      };
    }),
  };
}
