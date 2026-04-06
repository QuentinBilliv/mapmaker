import type { ChoroplethEntry } from "./types";

let cache: GeoJSON.FeatureCollection | null = null;

export async function loadCountriesGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  if (cache) return cache;
  const res = await fetch("/geo/countries-50m.geojson");
  const raw: GeoJSON.FeatureCollection = await res.json();
  cache = {
    type: "FeatureCollection",
    features: raw.features.map((f) => ({
      ...f,
      geometry: fixAntimeridian(f.geometry),
    })),
  };
  return cache;
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
    features: countries.features
      .filter((f) => {
        const iso = f.properties?.iso_a3 as string;
        return iso && entries[iso];
      })
      .map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          _color: entries[f.properties!.iso_a3 as string].color,
        },
      })),
  };
}

export function findCountryAtPoint(
  geojson: GeoJSON.FeatureCollection,
  lng: number,
  lat: number,
): CountryInfo | null {
  for (const f of geojson.features) {
    const iso = f.properties?.iso_a3 as string;
    const name = f.properties?.name as string;
    if (!iso || !name) continue;
    if (pointInGeometry(lng, lat, f.geometry)) {
      return { iso, name };
    }
  }
  return null;
}

function pointInGeometry(lng: number, lat: number, geom: GeoJSON.Geometry): boolean {
  if (geom.type === "Polygon") {
    return pointInPolygon(lng, lat, geom.coordinates);
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.some((poly) => pointInPolygon(lng, lat, poly));
  }
  return false;
}

function pointInPolygon(lng: number, lat: number, rings: number[][][]): boolean {
  if (rings.length === 0) return false;
  if (!pointInRing(lng, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lng, lat, rings[i])) return false;
  }
  return true;
}

function pointInRing(px: number, py: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
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
