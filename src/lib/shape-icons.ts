import maplibregl from "maplibre-gl";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PointShape } from "./types";
import { loadCatalogEntry } from "./icon-catalog";
import { sanitizeSvg } from "./svg-sanitizer";

const SIZE = 32;
const HALF = SIZE / 2;
const PAD = 3;
const R = HALF - PAD;

type Drawer = (ctx: CanvasRenderingContext2D) => void;

const SHAPE_PATHS: Record<PointShape, Drawer> = {
  circle(ctx) {
    ctx.arc(HALF, HALF, R, 0, Math.PI * 2);
  },
  triangle(ctx) {
    ctx.moveTo(HALF, PAD);
    ctx.lineTo(SIZE - PAD, SIZE - PAD);
    ctx.lineTo(PAD, SIZE - PAD);
    ctx.closePath();
  },
  square(ctx) {
    ctx.rect(PAD, PAD, SIZE - PAD * 2, SIZE - PAD * 2);
  },
  diamond(ctx) {
    ctx.moveTo(HALF, PAD);
    ctx.lineTo(SIZE - PAD, HALF);
    ctx.lineTo(HALF, SIZE - PAD);
    ctx.lineTo(PAD, HALF);
    ctx.closePath();
  },
  star(ctx) {
    const outerR = R;
    const innerR = R * 0.45;
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = HALF + Math.cos(angle) * r;
      const y = HALF + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  },
  cross(ctx) {
    const t = 5;
    ctx.moveTo(HALF - t, PAD);
    ctx.lineTo(HALF + t, PAD);
    ctx.lineTo(HALF + t, HALF - t);
    ctx.lineTo(SIZE - PAD, HALF - t);
    ctx.lineTo(SIZE - PAD, HALF + t);
    ctx.lineTo(HALF + t, HALF + t);
    ctx.lineTo(HALF + t, SIZE - PAD);
    ctx.lineTo(HALF - t, SIZE - PAD);
    ctx.lineTo(HALF - t, HALF + t);
    ctx.lineTo(PAD, HALF + t);
    ctx.lineTo(PAD, HALF - t);
    ctx.lineTo(HALF - t, HALF - t);
    ctx.closePath();
  },
};


function renderDrawer(drawer: Drawer, color: string, stroke = true): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  ctx.beginPath();
  drawer(ctx);

  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
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
  color: string
) {
  const id = `shape-${shape}-${color.replace("#", "")}`;
  if (!map.hasImage(id)) {
    addIfMissing(map, id, renderDrawer(SHAPE_PATHS[shape], color));
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

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.globalCompositeOperation = "destination-over";

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
