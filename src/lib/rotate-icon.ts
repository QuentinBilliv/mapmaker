import { COLORS } from "./defaults";

const ROTATE_ICON_ID = "shape-rotate-icon";

export { ROTATE_ICON_ID };

export function createRotateIcon(): ImageData {
  const s = 36;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const mid = s / 2;

  ctx.beginPath();
  ctx.arc(mid, mid, 14, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  const r = 7;

  function drawArc() {
    ctx.beginPath();
    ctx.arc(mid, mid, r, -Math.PI * 0.8, Math.PI * 0.5);
    ctx.stroke();

    const tipAngle = Math.PI * 0.5;
    const tx = mid + r * Math.cos(tipAngle);
    const ty = mid + r * Math.sin(tipAngle);
    const ah = 4;
    ctx.beginPath();
    ctx.moveTo(tx + ah * Math.cos(tipAngle - 0.3), ty + ah * Math.sin(tipAngle - 0.3));
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx + ah * Math.cos(tipAngle + 1.9), ty + ah * Math.sin(tipAngle + 1.9));
    ctx.stroke();
  }

  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawArc();

  return ctx.getImageData(0, 0, s, s);
}

export function ensureRotateIcon(map: maplibregl.Map) {
  if (!map.hasImage(ROTATE_ICON_ID)) map.addImage(ROTATE_ICON_ID, createRotateIcon());
}
