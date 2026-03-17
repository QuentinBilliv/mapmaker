import type { Coord } from "./geo-math";

function dist(a: Coord, b: Coord): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function lerp(a: Coord, b: Coord, t: number): Coord {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function roundCorner(prev: Coord, corner: Coord, next: Coord, radius: number): Coord[] {
  const d1 = dist(prev, corner);
  const d2 = dist(next, corner);
  const maxOffset = Math.min(d1, d2) * 0.5;
  const offset = Math.min(radius, maxOffset);
  if (offset < 1e-10) return [corner];

  const t1 = offset / d1;
  const t2 = offset / d2;
  const start = lerp(corner, prev, t1);
  const end = lerp(corner, next, t2);

  const steps = 8;
  const points: Coord[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = lerp(start, corner, t);
    const b = lerp(corner, end, t);
    points.push(lerp(a, b, t));
  }
  return points;
}

function roundRing(coords: Coord[], radius: number): Coord[] {
  const open = coords[0][0] === coords[coords.length - 1][0] &&
               coords[0][1] === coords[coords.length - 1][1]
    ? coords.slice(0, -1)
    : coords;

  if (open.length < 3) return coords;

  const result: Coord[] = [];
  for (let i = 0; i < open.length; i++) {
    const prev = open[(i - 1 + open.length) % open.length];
    const curr = open[i];
    const next = open[(i + 1) % open.length];
    result.push(...roundCorner(prev, curr, next, radius));
  }
  result.push(result[0]);
  return result;
}

function roundLine(coords: Coord[], radius: number): Coord[] {
  if (coords.length < 3) return coords;

  const result: Coord[] = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) {
    result.push(...roundCorner(coords[i - 1], coords[i], coords[i + 1], radius));
  }
  result.push(coords[coords.length - 1]);
  return result;
}

export function smoothGeometry(
  geometry: GeoJSON.Geometry,
  smoothing: number
): GeoJSON.Geometry {
  if (smoothing <= 0) return geometry;

  const radius = smoothing * 5;

  if (geometry.type === "LineString") {
    return {
      type: "LineString",
      coordinates: roundLine(geometry.coordinates as Coord[], radius),
    };
  }

  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) =>
        roundRing(ring as Coord[], radius)
      ),
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((poly) =>
        poly.map((ring) => roundRing(ring as Coord[], radius))
      ),
    };
  }

  if (geometry.type === "MultiLineString") {
    return {
      type: "MultiLineString",
      coordinates: geometry.coordinates.map((line) =>
        roundLine(line as Coord[], radius)
      ),
    };
  }

  return geometry;
}
