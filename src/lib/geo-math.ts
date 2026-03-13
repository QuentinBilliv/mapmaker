export type Coord = [number, number];

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
