import type { ModuleTheme } from '@/lib/moduleThemes';

/** Misma semilla que map3d/viewer/backdrop.ts: las estrellas no saltan al redibujar. */
const STAR_SEED = 0x6d2b79f5;
const STAR_COUNT = 180;
const STAR_HEIGHT_RATIO = 0.7;

export interface BackdropPaint {
  width: number;
  height: number;
  theme: ModuleTheme;
  isNight: boolean;
}

function paintSky(ctx: CanvasRenderingContext2D, paint: BackdropPaint): void {
  const stops = paint.isNight ? paint.theme.night : paint.theme.day;
  const gradient = ctx.createLinearGradient(0, 0, 0, paint.height);
  stops.forEach((stop, index) => gradient.addColorStop(index / (stops.length - 1), stop));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, paint.width, paint.height);
}

function traceTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, up: boolean): void {
  ctx.beginPath();
  ctx.moveTo(x, up ? y + h : y);
  ctx.lineTo(x + w / 2, up ? y : y + h);
  ctx.lineTo(x + w, up ? y + h : y);
  ctx.closePath();
}

function rowFade(rowTop: number, { height, isNight }: BackdropPaint): number {
  const position = Math.max(0, Math.min(1, rowTop / height));
  return isNight ? 0.5 + 0.5 * Math.pow(1 - Math.abs(position - 0.52) / 0.52, 1.35) : Math.pow(1 - position, 0.8);
}

function setTriangleColors(ctx: CanvasRenderingContext2D, paint: BackdropPaint, highlighted: boolean, fade: number): void {
  const color = paint.isNight ? paint.theme.nightAccent : '255, 255, 255';
  const fill = paint.isNight ? (highlighted ? 0.03 : 0.015) : highlighted ? 0.085 : 0.06;
  ctx.fillStyle = `rgba(${color}, ${fill * fade})`;
  ctx.strokeStyle = `rgba(${color}, ${(paint.isNight ? 0.12 : 0.09) * fade})`;
}

function paintTriangles(ctx: CanvasRenderingContext2D, paint: BackdropPaint): void {
  const w = paint.isNight ? 34 : 42;
  const h = paint.isNight ? 30 : 36;
  ctx.lineWidth = 1;
  for (let row = -2; row < paint.height / h + 3; row++) {
    const fade = rowFade(row * h, paint);
    for (let col = -2; col < paint.width / w + 3; col++) {
      setTriangleColors(ctx, paint, (row + col) % 5 === 0, fade);
      traceTriangle(ctx, col * w + (row & 1) * (w / 2), row * h, w, h, ((row + col) & 1) === 0);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function paintStars(ctx: CanvasRenderingContext2D, { width, height }: BackdropPaint): void {
  const random = seededRandom(STAR_SEED);
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = random() * width;
    const y = random() * height * STAR_HEIGHT_RATIO;
    const radius = 0.5 + random() * 1.5;
    ctx.fillStyle = `rgba(245, 248, 255, ${0.2 + random() * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintModuleBackdrop(ctx: CanvasRenderingContext2D, paint: BackdropPaint): void {
  paintSky(ctx, paint);
  paintTriangles(ctx, paint);
  if (paint.isNight) paintStars(ctx, paint);
}
