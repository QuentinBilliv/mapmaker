export type Coord = [number, number];

const R = 6_371_000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversine(a: Coord, b: Coord): number {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinLon * sinLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function polylineLength(coords: number[][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversine(coords[i - 1] as Coord, coords[i] as Coord);
  }
  return total;
}

export function polygonArea(ring: number[][]): number {
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    total += toRad(ring[j][0] - ring[i][0]) * (2 + Math.sin(toRad(ring[i][1])) + Math.sin(toRad(ring[j][1])));
  }
  return Math.abs((total * R * R) / 2);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  if (meters < 100_000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters / 1000)} km`;
}

export function formatArea(sqMeters: number): string {
  if (sqMeters < 10_000) return `${Math.round(sqMeters)} m²`;
  if (sqMeters < 1_000_000) return `${(sqMeters / 10_000).toFixed(1)} ha`;
  if (sqMeters < 1e10) return `${(sqMeters / 1_000_000).toFixed(1)} km²`;
  return `${Math.round(sqMeters / 1_000_000)} km²`;
}

export function toMercatorY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

export function fromMercatorY(y: number): number {
  return (360 / Math.PI) * Math.atan(Math.exp((y * Math.PI) / 180)) - 90;
}

export function rotateCoords(
  coords: Coord[],
  center: Coord,
  angle: number
): Coord[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cy = toMercatorY(center[1]);
  return coords.map((c) => {
    const dx = c[0] - center[0];
    const dy = toMercatorY(c[1]) - cy;
    return [
      center[0] + dx * cos - dy * sin,
      fromMercatorY(cy + dx * sin + dy * cos),
    ] as Coord;
  });
}

export interface BboxInfo {
  corners: Coord[];
  center: Coord;
  topCenter: Coord;
  handlePos: Coord;
}

export function computeBbox(coords: Coord[]): BboxInfo {
  if (coords.length === 0) {
    return {
      corners: [[0, 0], [0, 0], [0, 0], [0, 0]],
      center: [0, 0],
      topCenter: [0, 0],
      handlePos: [0, 0.0003],
    };
  }
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const c of coords) {
    if (c[0] < minLng) minLng = c[0];
    if (c[0] > maxLng) maxLng = c[0];
    if (c[1] < minLat) minLat = c[1];
    if (c[1] > maxLat) maxLat = c[1];
  }
  const pad = Math.max((maxLng - minLng) * 0.06, (maxLat - minLat) * 0.06, 0.0001);
  minLng -= pad;
  maxLng += pad;
  minLat -= pad;
  maxLat += pad;
  const corners: Coord[] = [
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
    [minLng, minLat],
  ];
  const center: Coord = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
  const topCenter: Coord = [(minLng + maxLng) / 2, maxLat];
  const armLen = Math.max((maxLat - minLat) * 0.15, 0.0003);
  const handlePos: Coord = [topCenter[0], topCenter[1] + armLen];
  return { corners, center, topCenter, handlePos };
}

export function rotateBbox(bbox: BboxInfo, angle: number): BboxInfo {
  const rotated = rotateCoords(
    [...bbox.corners, bbox.topCenter, bbox.handlePos],
    bbox.center,
    angle,
  );
  return {
    corners: rotated.slice(0, 4) as Coord[],
    center: bbox.center,
    topCenter: rotated[4],
    handlePos: rotated[5],
  };
}
