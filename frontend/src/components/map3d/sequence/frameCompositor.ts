import type { LogoState } from './logoMotion';
import type { SequenceFrame } from './sequenceTimeline';

/**
 * Dibuja en un canvas 2D lo que en vivo hacen los filtros CSS (SPEC-118 §8): el
 * video solo guarda los píxeles del canvas, no el CSS de la página.
 */

/** Lo que se usa de un contexto 2D: así se prueba sin un canvas real. */
export type Canvas2D = Pick<CanvasRenderingContext2D, 'filter' | 'globalAlpha' | 'imageSmoothingEnabled' | 'fillStyle'
  | 'save' | 'restore' | 'fillRect' | 'translate' | 'scale' | 'rotate' | 'drawImage'>;

export interface FrameSize { width: number; height: number }

/** El logo de §9: la pixelada va sin suavizar, la original suavizada. */
export interface LogoLayer { image: CanvasImageSource; state: LogoState; smooth: boolean }

/** El logo es cuadrado: se dibuja centrado en su punto, girado y con su opacidad. */
function drawLogo(ctx: Canvas2D, { width, height }: FrameSize, { image, state, smooth }: LogoLayer) {
  if (!state.visible || state.opacity <= 0) return;
  const side = state.width * width;
  ctx.save();
  ctx.imageSmoothingEnabled = smooth;
  ctx.globalAlpha = state.opacity;
  ctx.translate(state.x * width, state.y * height);
  ctx.rotate((state.rotationDeg * Math.PI) / 180);
  ctx.drawImage(image, -side / 2, -side / 2, side, side);
  ctx.restore();
}

export function composeFrame(ctx: Canvas2D, { width, height }: FrameSize, scene: CanvasImageSource,
  frozen: CanvasImageSource | null, f: SequenceFrame, logo?: LogoLayer): void {
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  // La versión de poca calidad viene a baja resolución: se amplía sin suavizar, como en vivo.
  ctx.imageSmoothingEnabled = false;
  ctx.filter = f.blurPx > 0 ? `blur(${f.blurPx.toFixed(2)}px) brightness(${f.brightness.toFixed(4)})` : 'none';
  ctx.translate(width / 2, height / 2);
  ctx.scale(f.scale, f.scale);
  ctx.translate(-width / 2, -height / 2);
  ctx.drawImage(scene, 0, 0, width, height);
  if (frozen && f.frozenOpacity > 0) {
    ctx.globalAlpha = f.frozenOpacity;
    ctx.drawImage(frozen, 0, 0, width, height);
    ctx.globalAlpha = 1;
  }
  if (logo) drawLogo(ctx, { width, height }, logo);
  ctx.restore();
}
