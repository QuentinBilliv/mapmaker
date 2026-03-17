import { type Coord, rotateCoords, toMercatorY, fromMercatorY } from "./geo-math";

export function nextOrder(items: { order: number }[]): number {
  if (items.length === 0) return 0;
  let max = items[0].order;
  for (let i = 1; i < items.length; i++) {
    if (items[i].order > max) max = items[i].order;
  }
  return max + 1;
}

function shiftCoords(coords: number[][], dlng: number, dMercY: number): number[][] {
  return coords.map((c) => [c[0] + dlng, fromMercatorY(toMercatorY(c[1]) + dMercY), ...c.slice(2)]);
}

export function shiftGeometry(g: GeoJSON.Geometry, dlng: number, dMercY: number): GeoJSON.Geometry {
  switch (g.type) {
    case "Point":
      return { type: "Point", coordinates: [g.coordinates[0] + dlng, fromMercatorY(toMercatorY(g.coordinates[1]) + dMercY)] };
    case "LineString":
      return { type: "LineString", coordinates: shiftCoords(g.coordinates, dlng, dMercY) };
    case "Polygon":
      return { type: "Polygon", coordinates: g.coordinates.map((r) => shiftCoords(r, dlng, dMercY)) };
    default:
      return g;
  }
}

export function rotateGeometry(g: GeoJSON.Geometry, center: Coord, angle: number): GeoJSON.Geometry {
  switch (g.type) {
    case "Point": {
      const [rotated] = rotateCoords([g.coordinates as Coord], center, angle);
      return { type: "Point", coordinates: rotated };
    }
    case "LineString":
      return { type: "LineString", coordinates: rotateCoords(g.coordinates as Coord[], center, angle) };
    case "Polygon":
      return { type: "Polygon", coordinates: g.coordinates.map((r) => rotateCoords(r as Coord[], center, angle)) };
    default:
      return g;
  }
}
