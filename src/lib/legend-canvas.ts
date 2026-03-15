import type { FeatureData, LineStyle, FillPattern } from "./types";
import { SHAPE_DRAWERS, DECO_DRAWERS, DECO_OFFSET_Y } from "./draw-primitives";
import { loadCatalogEntry } from "./icon-catalog";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sanitizeSvg } from "./svg-sanitizer";

const DASH_MAP: Record<LineStyle, number[] | undefined> = {
  solid: undefined,
  dotted: [3, 6],
  "dash-short": [6, 6],
  "dash-medium": [12, 8],
  "dash-long": [20, 10],
};

const FILL_GAP = 8;
const FILL_HALF = FILL_GAP / 2;
const DOT_SPACING = 8;
const DOT_R = 2;

const PATTERN_TESTS: Record<Exclude<FillPattern, "none">, (x: number, y: number) => boolean> = {
  "stripes-diagonal": (x, y) => (x + y) % FILL_GAP < FILL_HALF,
  "stripes-horizontal": (_x, y) => y % FILL_GAP < FILL_HALF,
  "stripes-vertical": (x) => x % FILL_GAP < FILL_HALF,
  crosshatch: (x, y) => (x + y) % FILL_GAP < FILL_HALF || (x - y + FILL_GAP * 1000) % FILL_GAP < FILL_HALF,
  dots: (x, y) => {
    const row = Math.floor(y / DOT_SPACING);
    const ox = row % 2 === 1 ? DOT_SPACING / 2 : 0;
    const gx = (x + ox) % DOT_SPACING - DOT_SPACING / 2;
    const gy = y % DOT_SPACING - DOT_SPACING / 2;
    return gx * gx + gy * gy < DOT_R * DOT_R;
  },
};

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, cy: number, direction: 1 | -1) {
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x - direction * size, cy - size * 0.6);
  ctx.lineTo(x - direction * size, cy + size * 0.6);
  ctx.closePath();
  ctx.fill();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

async function drawIconFromSvg(ctx: CanvasRenderingContext2D, svgMarkup: string, color: string, opacity: number, w: number, h: number) {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const size = Math.min(w, h) * 0.7;
    const scale = Math.min(size / img.width, size / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    const cx = (w - iw) / 2;
    const cy = (h - ih) / 2;

    ctx.globalAlpha = opacity;
    ctx.drawImage(img, cx, cy, iw, ih);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function drawPoint(ctx: CanvasRenderingContext2D, f: FeatureData & { type: "point" }, w: number, h: number) {
  if (f.icon) {
    const entry = await loadCatalogEntry(f.icon);
    if (entry) {
      const svgMarkup = renderToStaticMarkup(createElement(entry.Icon, { size: Math.min(w, h) * 0.7 }));
      await drawIconFromSvg(ctx, svgMarkup, f.color, f.opacity, w, h);
      return;
    }
  }

  if (f.customSvg) {
    const sanitized = sanitizeSvg(f.customSvg);
    await drawIconFromSvg(ctx, sanitized, f.color, f.opacity, w, h);
    return;
  }

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.35;
  const shape = f.shape ?? "circle";

  ctx.globalAlpha = f.opacity;
  ctx.fillStyle = f.color;
  ctx.beginPath();
  SHAPE_DRAWERS[shape](ctx, cx, cy, r);
  ctx.fill();

  if (f.borderWidth > 0) {
    ctx.strokeStyle = f.borderColor;
    ctx.lineWidth = Math.max(1, f.borderWidth * 0.4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawLine(ctx: CanvasRenderingContext2D, f: FeatureData & { type: "polyline" }, w: number, h: number) {
  const cy = h / 2;
  const hasForward = f.arrowStyle === "forward" || f.arrowStyle === "both";
  const hasBackward = f.arrowStyle === "both";
  const pad = 4;
  const x1 = hasBackward ? pad + 8 : pad;
  const x2 = hasForward ? w - pad - 8 : w - pad;
  const sw = Math.min(f.strokeWidth * 1.2, 6);

  ctx.globalAlpha = f.opacity;
  ctx.strokeStyle = f.color;
  ctx.fillStyle = f.color;
  ctx.lineWidth = sw;
  ctx.lineCap = "round";

  const dash = DASH_MAP[f.lineStyle];
  if (dash) ctx.setLineDash(dash);
  else ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(x1, cy);
  ctx.lineTo(x2, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  if (f.lineDecoration !== "none") {
    const decoSize = h * 0.9;
    const span = x2 - x1;
    const dx = x1 + span / 2;
    const offsetY = (DECO_OFFSET_Y[f.lineDecoration] ?? 0) * decoSize * 0.02;
    DECO_DRAWERS[f.lineDecoration](ctx, dx, cy + offsetY, decoSize);
  }

  if (hasForward) drawArrowHead(ctx, w - pad, cy, 1);
  if (hasBackward) drawArrowHead(ctx, pad, cy, -1);

  ctx.globalAlpha = 1;
}

function polygonOutline(ctx: CanvasRenderingContext2D, shape: "circle" | "rectangle" | "free", cx: number, cy: number, r: number) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else if (shape === "rectangle") {
    const hw = r;
    const hh = r * 0.7;
    ctx.rect(cx - hw, cy - hh, hw * 2, hh * 2);
  } else {
    SHAPE_DRAWERS.hexagon(ctx, cx, cy, r);
  }
}

type EdgePoint = { x: number; y: number; angle: number };

function polygonDecoPositions(shape: "circle" | "rectangle" | "free", cx: number, cy: number, r: number): EdgePoint[] {
  if (shape === "circle") {
    const count = 6;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, angle };
    });
  }
  if (shape === "rectangle") {
    const hw = r;
    const hh = r * 0.7;
    return [
      { x: cx - hw * 0.35, y: cy - hh, angle: -Math.PI / 2 },
      { x: cx + hw * 0.35, y: cy - hh, angle: -Math.PI / 2 },
      { x: cx + hw, y: cy, angle: 0 },
      { x: cx + hw * 0.35, y: cy + hh, angle: Math.PI / 2 },
      { x: cx - hw * 0.35, y: cy + hh, angle: Math.PI / 2 },
      { x: cx - hw, y: cy, angle: Math.PI },
    ];
  }
  // Hexagon — one decoration per edge midpoint
  const points: EdgePoint[] = [];
  for (let i = 0; i < 6; i++) {
    const a1 = (i * 2 * Math.PI) / 6 - Math.PI / 6;
    const a2 = ((i + 1) * 2 * Math.PI) / 6 - Math.PI / 6;
    const mx = cx + (Math.cos(a1) + Math.cos(a2)) * r / 2;
    const my = cy + (Math.sin(a1) + Math.sin(a2)) * r / 2;
    const normalAngle = (a1 + a2) / 2;
    points.push({ x: mx, y: my, angle: normalAngle });
  }
  return points;
}

function drawPolygon(ctx: CanvasRenderingContext2D, f: FeatureData & { type: "polygon" }, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.35;
  const shape = f.shapeOrigin === "circle" ? "circle" : f.shapeOrigin === "rectangle" ? "rectangle" : "free";

  // Fill (uses feature opacity)
  if (f.fillPattern !== "none") {
    ctx.save();
    ctx.globalAlpha = f.opacity;
    polygonOutline(ctx, shape, cx, cy, r);
    ctx.clip();
    ctx.fillStyle = f.color;
    const test = PATTERN_TESTS[f.fillPattern];
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (test(px, py)) ctx.fillRect(px, py, 1, 1);
      }
    }
    ctx.restore();
  } else if (f.opacity > 0) {
    ctx.fillStyle = f.color;
    ctx.globalAlpha = f.opacity;
    polygonOutline(ctx, shape, cx, cy, r);
    ctx.fill();
  }

  // Stroke (always full opacity, like the map)
  ctx.globalAlpha = 1;
  ctx.strokeStyle = f.color;
  ctx.lineWidth = Math.max(Math.min(f.strokeWidth, 4), 1.5);
  const dash = DASH_MAP[f.lineStyle];
  ctx.setLineDash(dash ? dash.map((v) => v * 0.5) : []);
  polygonOutline(ctx, shape, cx, cy, r);
  ctx.stroke();
  ctx.setLineDash([]);

  // Line decorations along the shape
  if (f.lineDecoration !== "none") {
    ctx.fillStyle = f.color;
    ctx.strokeStyle = f.color;
    const decoSize = r * 0.55;
    const rawOffset = DECO_OFFSET_Y[f.lineDecoration] ?? 0;
    const offsetDist = -rawOffset * decoSize * 0.04;
    const positions = polygonDecoPositions(shape, cx, cy, r);
    for (const p of positions) {
      const nx = Math.cos(p.angle);
      const ny = Math.sin(p.angle);
      ctx.save();
      ctx.translate(p.x + nx * offsetDist, p.y + ny * offsetDist);
      ctx.rotate(p.angle + Math.PI / 2);
      DECO_DRAWERS[f.lineDecoration](ctx, 0, 0, decoSize);
      ctx.restore();
    }
  }
}

const FONT_MAP: Record<string, string> = {
  sans: "sans-serif",
  serif: "serif",
  mono: "monospace",
};

function drawText(ctx: CanvasRenderingContext2D, f: FeatureData & { type: "text" }, w: number, h: number) {
  const fontSize = Math.min(h * 0.7, 24);
  const font = FONT_MAP[f.fontFamily] ?? "sans-serif";
  ctx.font = `${fontSize}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = f.opacity;

  if (f.textBorderEnabled && f.textBorderWidth > 0) {
    ctx.strokeStyle = f.textBorderColor;
    ctx.lineWidth = f.textBorderWidth * 2;
    ctx.lineJoin = "round";
    ctx.strokeText("Text", w / 2, h / 2);
  }

  ctx.fillStyle = f.color;
  ctx.fillText("Text", w / 2, h / 2);
  ctx.globalAlpha = 1;
}

export async function drawShape(ctx: CanvasRenderingContext2D, feature: FeatureData, w: number, h: number) {
  switch (feature.type) {
    case "point":
      return drawPoint(ctx, feature, w, h);
    case "polyline":
      return drawLine(ctx, feature, w, h);
    case "polygon":
      return drawPolygon(ctx, feature, w, h);
    case "text":
      return drawText(ctx, feature, w, h);
  }
}
