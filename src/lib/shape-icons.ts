import maplibregl from "maplibre-gl";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PointShape } from "./types";
import { loadCatalogEntry } from "./icon-catalog";
import { COLORS, DEFAULT_BORDER_WIDTH } from "./defaults";
import { sanitizeSvg } from "./svg-sanitizer";
import { SHAPE_DRAWERS } from "./draw-primitives";

const SIZE = 128;
const HALF = SIZE / 2;
const PAD = 10;
const R = HALF - PAD;

export const ICON_SCALE = 0.25;


function renderShape(
  shape: PointShape,
  color: string,
  borderColor = COLORS.white,
  borderWidth = DEFAULT_BORDER_WIDTH
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  ctx.beginPath();
  SHAPE_DRAWERS[shape](ctx, HALF, HALF, R);

  ctx.fillStyle = color;
  ctx.fill();
  if (borderWidth > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, SIZE, SIZE);
}

function addIfMissing(map: maplibregl.Map, id: string, data: ImageData) {
  if (map.hasImage(id)) return;
  map.addImage(id, data, { sdf: false });
}

export function ensureShapeIcon(
  map: maplibregl.Map,
  shape: PointShape,
  color: string,
  borderColor = COLORS.white,
  borderWidth = DEFAULT_BORDER_WIDTH
) {
  const bc = borderColor.replace("#", "");
  const id = `shape-${shape}-${color.replace("#", "")}-${bc}-${borderWidth}`;
  if (!map.hasImage(id)) {
    addIfMissing(map, id, renderShape(shape, color, borderColor, borderWidth));
  }
  return id;
}

export function catalogIconId(iconId: string, color: string): string {
  return `catalog-${iconId}-${color.replace("#", "")}`;
}

export async function ensureCatalogIcon(
  map: maplibregl.Map,
  iconId: string,
  color: string
): Promise<string> {
  const id = catalogIconId(iconId, color);
  if (map.hasImage(id)) return id;

  const entry = await loadCatalogEntry(iconId);
  if (!entry) return ensureShapeIcon(map, "circle", color);

  const svgMarkup = renderToStaticMarkup(createElement(entry.Icon, { size: SIZE }));
  const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    const scale = Math.min(SIZE / img.width, SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, SIZE, SIZE);
    addIfMissing(map, id, ctx.getImageData(0, 0, SIZE, SIZE));
  } finally {
    URL.revokeObjectURL(url);
  }

  return id;
}

function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function customSvgIconId(svg: string, color: string) {
  return `custom-${hashString(svg)}-${color.replace("#", "")}`;
}

export async function ensureCustomSvgIcon(
  map: maplibregl.Map,
  rawSvg: string,
  color: string
): Promise<string> {
  const id = customSvgIconId(rawSvg, color);
  if (map.hasImage(id)) return id;

  const sanitized = sanitizeSvg(rawSvg);
  const blob = new Blob([sanitized], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    const scale = Math.min(SIZE / img.width, SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);

    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, SIZE, SIZE);

    addIfMissing(map, id, ctx.getImageData(0, 0, SIZE, SIZE));
  } finally {
    URL.revokeObjectURL(url);
  }

  return id;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load SVG"));
    img.src = src;
  });
}
