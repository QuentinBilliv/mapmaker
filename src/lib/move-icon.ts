import { COLORS } from "./defaults";

const MOVE_ICON_ID = "shape-move-icon";

export { MOVE_ICON_ID };

export function createMoveIcon(): ImageData {
  const s = 32;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const mid = s / 2;
  const arm = 11;
  const ah = 4;

  function drawArrows() {
    const dirs: [number, number, number, number][] = [
      [0, -1, 1, 0], [0, 1, 1, 0], [-1, 0, 0, 1], [1, 0, 0, 1],
    ];
    for (const [dx, dy, px, py] of dirs) {
      const ex = mid + dx * arm;
      const ey = mid + dy * arm;
      ctx.moveTo(mid, mid);
      ctx.lineTo(ex, ey);
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - dx * ah + px * ah * 0.5, ey - dy * ah + py * ah * 0.5);
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - dx * ah - px * ah * 0.5, ey - dy * ah - py * ah * 0.5);
    }
  }

  ctx.beginPath();
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawArrows();
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2;
  drawArrows();
  ctx.stroke();

  return ctx.getImageData(0, 0, s, s);
}

export function ensureMoveIcon(map: maplibregl.Map) {
  if (!map.hasImage(MOVE_ICON_ID)) map.addImage(MOVE_ICON_ID, createMoveIcon());
}
