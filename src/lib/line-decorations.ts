import maplibregl from "maplibre-gl";
import type { LineDecoration } from "./types";

const ICON_SIZE = 32;
const PR = 2;
const SIZE = ICON_SIZE * PR;

type DrawFn = (ctx: CanvasRenderingContext2D, s: number) => void;

const drawFns: Record<Exclude<LineDecoration, "none">, DrawFn> = {
  crosses(ctx, s) {
    const m = s * 0.3;
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(s / 2 - m, s / 2 - m);
    ctx.lineTo(s / 2 + m, s / 2 + m);
    ctx.moveTo(s / 2 + m, s / 2 - m);
    ctx.lineTo(s / 2 - m, s / 2 + m);
    ctx.stroke();
  },
  "crosses-free"(ctx, s) {
    drawFns.crosses(ctx, s);
  },
  ticks(ctx, s) {
    const h = s * 0.35;
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(s / 2, s / 2 - h);
    ctx.lineTo(s / 2, s / 2 + h);
    ctx.stroke();
  },
  "triangles-up"(ctx, s) {
    const w = s * 0.4;
    const h = s * 0.35;
    ctx.beginPath();
    ctx.moveTo(s / 2, s / 2 - h);
    ctx.lineTo(s / 2 + w / 2, s / 2 + h * 0.3);
    ctx.lineTo(s / 2 - w / 2, s / 2 + h * 0.3);
    ctx.closePath();
    ctx.fill();
  },
  "triangles-down"(ctx, s) {
    const w = s * 0.4;
    const h = s * 0.35;
    ctx.beginPath();
    ctx.moveTo(s / 2, s / 2 + h);
    ctx.lineTo(s / 2 + w / 2, s / 2 - h * 0.3);
    ctx.lineTo(s / 2 - w / 2, s / 2 - h * 0.3);
    ctx.closePath();
    ctx.fill();
  },
  "arrows-down"(ctx, s) {
    const w = s * 0.22;
    const h = s * 0.35;
    const stemW = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(s / 2, s / 2 + h);
    ctx.lineTo(s / 2 + w, s / 2);
    ctx.lineTo(s / 2 + stemW, s / 2);
    ctx.lineTo(s / 2 + stemW, s / 2 - h);
    ctx.lineTo(s / 2 - stemW, s / 2 - h);
    ctx.lineTo(s / 2 - stemW, s / 2);
    ctx.lineTo(s / 2 - w, s / 2);
    ctx.closePath();
    ctx.fill();
  },
  "arrows-up"(ctx, s) {
    const w = s * 0.22;
    const h = s * 0.35;
    const stemW = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(s / 2, s / 2 - h);
    ctx.lineTo(s / 2 + w, s / 2);
    ctx.lineTo(s / 2 + stemW, s / 2);
    ctx.lineTo(s / 2 + stemW, s / 2 + h);
    ctx.lineTo(s / 2 - stemW, s / 2 + h);
    ctx.lineTo(s / 2 - stemW, s / 2);
    ctx.lineTo(s / 2 - w, s / 2);
    ctx.closePath();
    ctx.fill();
  },
  railway(ctx, s) {
    const h = s * 0.35;
    ctx.lineWidth = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(s / 2, s / 2 - h);
    ctx.lineTo(s / 2, s / 2 + h);
    ctx.stroke();
  },
};

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

  drawFns[decoration](ctx, SIZE);

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
