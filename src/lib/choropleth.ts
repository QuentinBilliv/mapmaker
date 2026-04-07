import type { ChoroplethCategory, ChoroplethData, TileLayerId } from "./types";

export interface TileLayerConfig {
  id: TileLayerId;
  label: string;
  file: string;
  idProp: string;
  nameProp: string;
  fixAntimeridian?: boolean;
  enrichFeature?: (f: GeoJSON.Feature) => GeoJSON.Feature;
}

const CA_PROVINCE_ABBR: Record<string, string> = {
  Alberta: "AB", "British Columbia": "BC", Manitoba: "MB", "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL", "Northwest Territories": "NT", "Nova Scotia": "NS",
  Nunavut: "NU", Ontario: "ON", "Prince Edward Island": "PE", Quebec: "QC",
  Saskatchewan: "SK", "Yukon Territory": "YT",
};

const US_STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "Puerto Rico": "PR",
};

export const TILE_LAYERS: TileLayerConfig[] = [
  {
    id: "countries",
    label: "Countries",
    file: "/geo/countries-50m.geojson",
    idProp: "name",
    nameProp: "name",
    fixAntimeridian: true,
  },
  {
    id: "us-states",
    label: "US States",
    file: "/geo/us-states.geojson",
    idProp: "abbr",
    nameProp: "name",
    enrichFeature: (f) => ({
      ...f,
      properties: {
        ...f.properties,
        abbr: US_STATE_ABBR[f.properties?.name as string] ?? "",
      },
    }),
  },
  {
    id: "canada-provinces",
    label: "Canadian Provinces",
    file: "/geo/canada-provinces.geojson",
    idProp: "abbr",
    nameProp: "name",
    enrichFeature: (f) => ({
      ...f,
      properties: {
        ...f.properties,
        abbr: CA_PROVINCE_ABBR[f.properties?.name as string] ?? "",
      },
    }),
  },
  {
    id: "france-departements",
    label: "French Départements",
    file: "/geo/france-departements.geojson",
    idProp: "code",
    nameProp: "nom",
  },
  {
    id: "eu-nuts2",
    label: "EU NUTS 2 Regions",
    file: "/geo/eu-nuts2.geojson",
    idProp: "NUTS_ID",
    nameProp: "NAME_LATN",
  },
  {
    id: "china-provinces",
    label: "Chinese Provinces",
    file: "/geo/china-provinces.geojson",
    idProp: "name",
    nameProp: "name",
  },
  {
    id: "india-states",
    label: "Indian States",
    file: "/geo/india-states.geojson",
    idProp: "name",
    nameProp: "name",
  },
  {
    id: "russia-regions",
    label: "Russian Regions",
    file: "/geo/russia-regions.geojson",
    idProp: "name_latin",
    nameProp: "name_latin",
    fixAntimeridian: true,
  },
];

export function getTileLayerConfig(id: TileLayerId): TileLayerConfig {
  return TILE_LAYERS.find((l) => l.id === id) ?? TILE_LAYERS[0];
}

const MAX_CACHE_SIZE = 3;
const cache = new Map<TileLayerId, GeoJSON.FeatureCollection>();

function cacheSet(key: TileLayerId, value: GeoJSON.FeatureCollection) {
  cache.delete(key);
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

export async function loadTileLayerGeoJSON(layerId: TileLayerId): Promise<GeoJSON.FeatureCollection> {
  const cached = cache.get(layerId);
  if (cached) {
    cache.delete(layerId);
    cache.set(layerId, cached);
    return cached;
  }
  const config = getTileLayerConfig(layerId);
  const res = await fetch(config.file);
  if (!res.ok) throw new Error(`Failed to load ${config.file} (${res.status})`);
  const raw: GeoJSON.FeatureCollection = await res.json();
  const result: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: raw.features
      .filter((f) => f.geometry != null)
      .map((f) => {
        let feature = config.enrichFeature ? config.enrichFeature(f) : f;
        if (config.fixAntimeridian && feature.geometry) {
          feature = { ...feature, geometry: fixAntimeridian(feature.geometry) };
        }
        return feature;
      }),
  };
  cacheSet(layerId, result);
  return result;
}

export async function loadCountriesGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  return loadTileLayerGeoJSON("countries");
}

export interface RegionInfo {
  id: string;
  name: string;
}

export type CountryInfo = RegionInfo;

export function getRegionList(geojson: GeoJSON.FeatureCollection, config: TileLayerConfig): RegionInfo[] {
  return geojson.features
    .map((f) => ({
      id: f.properties?.[config.idProp] as string,
      name: f.properties?.[config.nameProp] as string,
    }))
    .filter((r) => r.id && r.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCountryList(geojson: GeoJSON.FeatureCollection): RegionInfo[] {
  return getRegionList(geojson, getTileLayerConfig("countries"));
}

export function buildChoroplethGeoJSON(
  regions: GeoJSON.FeatureCollection,
  categories: ChoroplethCategory[],
  assignments: Record<string, string>,
  config: TileLayerConfig,
): GeoJSON.FeatureCollection {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  return {
    type: "FeatureCollection",
    features: regions.features
      .filter((f) => {
        const id = f.properties?.[config.idProp] as string;
        return id && assignments[id] && catMap.has(assignments[id]);
      })
      .map((f) => {
        const id = f.properties![config.idProp] as string;
        const cat = catMap.get(assignments[id])!;
        return {
          ...f,
          properties: {
            ...f.properties,
            _color: cat.color,
            _categoryId: cat.id,
            _tooltip_title: f.properties?.[config.nameProp] ?? id,
            _tooltip_desc: cat.label,
          },
        };
      }),
  };
}

export function buildGradientChoroplethGeoJSON(
  regions: GeoJSON.FeatureCollection,
  gradientColors: [string, string],
  values: Record<string, number>,
  config: TileLayerConfig,
): GeoJSON.FeatureCollection {
  const ids = Object.keys(values);
  if (ids.length === 0) return { type: "FeatureCollection", features: [] };
  const nums = Object.values(values);
  let min = Infinity, max = -Infinity;
  for (const n of nums) { if (n < min) min = n; if (n > max) max = n; }
  const range = max - min || 1;
  const [startR, startG, startB] = hexToRgb(gradientColors[0]);
  const [endR, endG, endB] = hexToRgb(gradientColors[1]);
  return {
    type: "FeatureCollection",
    features: regions.features
      .filter((f) => {
        const id = f.properties?.[config.idProp] as string;
        return id && id in values;
      })
      .map((f) => {
        const id = f.properties![config.idProp] as string;
        const t = (values[id] - min) / range;
        const r = Math.round(startR + t * (endR - startR));
        const g = Math.round(startG + t * (endG - startG));
        const b = Math.round(startB + t * (endB - startB));
        return {
          ...f,
          properties: {
            ...f.properties,
            _color: rgbToHex(r, g, b),
            _categoryId: "__gradient__",
            _tooltip_title: f.properties?.[config.nameProp] ?? id,
            _tooltip_desc: String(values[id]),
          },
        };
      }),
  };
}

export function buildChoroplethGeoJSONFromData(
  regions: GeoJSON.FeatureCollection,
  choropleth: ChoroplethData,
): GeoJSON.FeatureCollection {
  const config = getTileLayerConfig(choropleth.tileLayer);
  if (choropleth.mode === "gradient") {
    return buildGradientChoroplethGeoJSON(
      regions,
      choropleth.gradientColors ?? ["#22c55e", "#3b82f6"],
      choropleth.values ?? {},
      config,
    );
  }
  return buildChoroplethGeoJSON(regions, choropleth.categories ?? [], choropleth.assignments ?? {}, config);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function interpolateGradientColor(
  gradientColors: [string, string],
  t: number,
): string {
  const [startR, startG, startB] = hexToRgb(gradientColors[0]);
  const [endR, endG, endB] = hexToRgb(gradientColors[1]);
  const r = Math.round(startR + t * (endR - startR));
  const g = Math.round(startG + t * (endG - startG));
  const b = Math.round(startB + t * (endB - startB));
  return rgbToHex(r, g, b);
}

function fixAntimeridian(geom: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geom.type === "Polygon") {
    return fixPolygonAntimeridian(geom);
  }
  if (geom.type === "MultiPolygon") {
    const parts: number[][][][] = [];
    for (const poly of geom.coordinates) {
      const fixed = fixPolygonAntimeridian({ type: "Polygon", coordinates: poly });
      if (fixed.type === "MultiPolygon") {
        parts.push(...fixed.coordinates);
      } else {
        parts.push(fixed.coordinates);
      }
    }
    return { type: "MultiPolygon", coordinates: parts };
  }
  return geom;
}

function ringCrossesAntimeridian(ring: number[][]): boolean {
  for (let i = 0; i < ring.length - 1; i++) {
    if (Math.abs(ring[i][0] - ring[i + 1][0]) > 180) return true;
  }
  return false;
}

function fixPolygonAntimeridian(
  geom: GeoJSON.Polygon,
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  const outerRing = geom.coordinates[0];
  if (!outerRing || !ringCrossesAntimeridian(outerRing)) return geom;

  const westRings: number[][][] = [];
  const eastRings: number[][][] = [];

  for (const ring of geom.coordinates) {
    const { west, east } = splitRingAtAntimeridian(ring);
    if (west.length >= 4) westRings.push(west);
    if (east.length >= 4) eastRings.push(east);
  }

  const polys: number[][][][] = [];
  if (westRings.length > 0) polys.push(westRings);
  if (eastRings.length > 0) polys.push(eastRings);

  if (polys.length === 0) return geom;
  if (polys.length === 1) return { type: "Polygon", coordinates: polys[0] };
  return { type: "MultiPolygon", coordinates: polys };
}

function splitRingAtAntimeridian(ring: number[][]): { west: number[][]; east: number[][] } {
  const west: number[][] = [];
  const east: number[][] = [];

  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const lon = p[0];

    if (i > 0) {
      const prev = ring[i - 1];
      if (Math.abs(prev[0] - lon) > 180) {
        const crossing = interpolateAntimeridian(prev, p);
        west.push(crossing.west);
        east.push(crossing.east);
      }
    }

    if (lon <= 0) {
      west.push(p);
    } else {
      east.push(p);
    }
  }

  if (west.length > 0 && (west[0][0] !== west[west.length - 1][0] || west[0][1] !== west[west.length - 1][1])) {
    west.push(west[0]);
  }
  if (east.length > 0 && (east[0][0] !== east[east.length - 1][0] || east[0][1] !== east[east.length - 1][1])) {
    east.push(east[0]);
  }

  return { west, east };
}

function interpolateAntimeridian(a: number[], b: number[]): { west: number[]; east: number[] } {
  const aLon = a[0], aLat = a[1];
  const bLon = b[0], bLat = b[1];

  let adjustedA = aLon;
  let adjustedB = bLon;
  if (aLon > 0 && bLon < 0) {
    adjustedB = bLon + 360;
  } else {
    adjustedA = aLon + 360;
  }

  const t = (180 - adjustedA) / (adjustedB - adjustedA);
  const lat = aLat + t * (bLat - aLat);

  return {
    east: [180, lat],
    west: [-180, lat],
  };
}
