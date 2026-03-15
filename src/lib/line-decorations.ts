import maplibregl from "maplibre-gl";
import type { LineDecoration } from "./types";
import { DECO_DRAWERS } from "./draw-primitives";

const ICON_SIZE = 32;
const PR = 2;
const SIZE = ICON_SIZE * PR;

function iconId(decoration: LineDecoration): string {
  return `line-deco-${decoration}`;
}

export function ensureDecorationIcon(
  map: maplibregl.Map,
  decoration: Exclude<LineDecoration, "none">
): string {
  const id = iconId(decoration);
  if (map.hasImage(id)) return id;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  ctx.lineCap = "round";

  DECO_DRAWERS[decoration](ctx, SIZE / 2, SIZE / 2, SIZE);

  map.addImage(id, ctx.getImageData(0, 0, SIZE, SIZE), {
    pixelRatio: PR,
    sdf: true,
  });
  return id;
}

export function ensureAllDecorationIcons(map: maplibregl.Map) {
  const decos: Exclude<LineDecoration, "none">[] = [
    "crosses", "crosses-free", "ticks",
    "triangles-up", "triangles-down",
    "arrows-down", "arrows-up", "railway",
  ];
  for (const d of decos) {
    ensureDecorationIcon(map, d);
  }
}

export { iconId as decorationIconId };
