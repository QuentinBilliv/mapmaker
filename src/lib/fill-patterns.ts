import maplibregl from "maplibre-gl";
import type { FillPattern } from "./types";

const TILE = 48;
const PIXEL_RATIO = 2;
const GAP = 16;
const HALF = GAP / 2;
const DOT_SPACING = 16;
const DOT_R_SQ = 5 * 5;

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

type PixelTest = (x: number, y: number) => boolean;

const tests: Record<FillPattern, PixelTest> = {
  none: () => true,
  "stripes-diagonal": (x, y) => (x + y) % GAP < HALF,
  "stripes-horizontal": (_x, y) => y % GAP < HALF,
  "stripes-vertical": (x) => x % GAP < HALF,
  crosshatch: (x, y) => (x + y) % GAP < HALF || (x - y + GAP * 1000) % GAP < HALF,
  dots: (x, y) => {
    const row = Math.floor(y / DOT_SPACING);
    const ox = row % 2 === 1 ? DOT_SPACING / 2 : 0;
    const gx = (x + ox) % DOT_SPACING - DOT_SPACING / 2;
    const gy = y % DOT_SPACING - DOT_SPACING / 2;
    return gx * gx + gy * gy < DOT_R_SQ;
  },
};

export function patternImageId(pattern: FillPattern, color: string, opacity: number): string {
  return `fill-${pattern}-${color.replace("#", "")}-${Math.round(opacity * 100)}`;
}

export function ensurePatternImage(
  map: maplibregl.Map,
  pattern: FillPattern,
  color: string,
  opacity: number
): string {
  const id = patternImageId(pattern, color, opacity);
  if (map.hasImage(id)) return id;

  const [r, g, b] = hexToRgb(color);
  const a = Math.round(opacity * 255);
  const test = tests[pattern];
  const imageData = new ImageData(TILE, TILE);
  const d = imageData.data;

  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (test(x, y)) {
        const i = (y * TILE + x) * 4;
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = a;
      }
    }
  }

  map.addImage(id, imageData, { pixelRatio: PIXEL_RATIO });
  return id;
}
