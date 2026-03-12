export type Coord = [number, number];

export function toMercatorY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

export function fromMercatorY(y: number): number {
  return (360 / Math.PI) * Math.atan(Math.exp((y * Math.PI) / 180)) - 90;
}
