import type { PointShape, LineDecoration } from "./types";

export type ShapeDrawFn = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => void;
export type DecoDrawFn = (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => void;

export const SHAPE_DRAWERS: Record<PointShape, ShapeDrawFn> = {
  circle(ctx, cx, cy, r) {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  },
  triangle(ctx, cx, cy, r) {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy + r);
    ctx.lineTo(cx - r, cy + r);
    ctx.closePath();
  },
  square(ctx, cx, cy, r) {
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
  },
  diamond(ctx, cx, cy, r) {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
  },
  star(ctx, cx, cy, r) {
    const inner = r * 0.45;
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : inner;
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  },
  cross(ctx, cx, cy, r) {
    const t = r * 0.35;
    ctx.moveTo(cx - t, cy - r);
    ctx.lineTo(cx + t, cy - r);
    ctx.lineTo(cx + t, cy - t);
    ctx.lineTo(cx + r, cy - t);
    ctx.lineTo(cx + r, cy + t);
    ctx.lineTo(cx + t, cy + t);
    ctx.lineTo(cx + t, cy + r);
    ctx.lineTo(cx - t, cy + r);
    ctx.lineTo(cx - t, cy + t);
    ctx.lineTo(cx - r, cy + t);
    ctx.lineTo(cx - r, cy - t);
    ctx.lineTo(cx - t, cy - t);
    ctx.closePath();
  },
  pentagon(ctx, cx, cy, r) {
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  },
  hexagon(ctx, cx, cy, r) {
    for (let i = 0; i < 6; i++) {
      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 6;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  },
};

export const DECO_DRAWERS: Record<Exclude<LineDecoration, "none">, DecoDrawFn> = {
  crosses(ctx, cx, cy, s) {
    const m = s * 0.3;
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx - m, cy - m);
    ctx.lineTo(cx + m, cy + m);
    ctx.moveTo(cx + m, cy - m);
    ctx.lineTo(cx - m, cy + m);
    ctx.stroke();
  },
  "crosses-free"(ctx, cx, cy, s) {
    DECO_DRAWERS.crosses(ctx, cx, cy, s);
  },
  ticks(ctx, cx, cy, s) {
    const h = s * 0.35;
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx, cy + h);
    ctx.stroke();
  },
  "triangles-up"(ctx, cx, cy, s) {
    const w = s * 0.4;
    const h = s * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + w / 2, cy + h * 0.3);
    ctx.lineTo(cx - w / 2, cy + h * 0.3);
    ctx.closePath();
    ctx.fill();
  },
  "triangles-down"(ctx, cx, cy, s) {
    const w = s * 0.4;
    const h = s * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, cy + h);
    ctx.lineTo(cx + w / 2, cy - h * 0.3);
    ctx.lineTo(cx - w / 2, cy - h * 0.3);
    ctx.closePath();
    ctx.fill();
  },
  "arrows-up"(ctx, cx, cy, s) {
    const w = s * 0.22;
    const h = s * 0.35;
    const stemW = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + w, cy);
    ctx.lineTo(cx + stemW, cy);
    ctx.lineTo(cx + stemW, cy + h);
    ctx.lineTo(cx - stemW, cy + h);
    ctx.lineTo(cx - stemW, cy);
    ctx.lineTo(cx - w, cy);
    ctx.closePath();
    ctx.fill();
  },
  "arrows-down"(ctx, cx, cy, s) {
    const w = s * 0.22;
    const h = s * 0.35;
    const stemW = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx, cy + h);
    ctx.lineTo(cx + w, cy);
    ctx.lineTo(cx + stemW, cy);
    ctx.lineTo(cx + stemW, cy - h);
    ctx.lineTo(cx - stemW, cy - h);
    ctx.lineTo(cx - stemW, cy);
    ctx.lineTo(cx - w, cy);
    ctx.closePath();
    ctx.fill();
  },
  railway(ctx, cx, cy, s) {
    const h = s * 0.35;
    ctx.lineWidth = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx, cy + h);
    ctx.stroke();
  },
};

export const DECO_OFFSET_Y: Partial<Record<LineDecoration, number>> = {
  "triangles-up": -10,
  "triangles-down": 10,
  "arrows-up": -10,
  "arrows-down": 10,
};
