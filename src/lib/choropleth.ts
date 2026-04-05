let cache: GeoJSON.FeatureCollection | null = null;

export async function loadCountriesGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  if (cache) return cache;
  const res = await fetch("/geo/countries-50m.geojson");
  cache = await res.json();
  return cache!;
}

export function getCountryNames(geojson: GeoJSON.FeatureCollection): string[] {
  return geojson.features
    .map((f) => f.properties?.name as string)
    .filter(Boolean)
    .sort();
}

export function buildChoroplethGeoJSON(
  countries: GeoJSON.FeatureCollection,
  entries: Record<string, string>,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: countries.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        _color: entries[f.properties?.name] ?? "rgba(0,0,0,0)",
        _painted: entries[f.properties?.name] ? 1 : 0,
      },
    })),
  };
}
