import type { SequenceFrame } from './sequenceTimeline';

/**
 * Dibuja en un canvas 2D lo que en vivo hacen los filtros CSS (SPEC-118 §8): el
 * video solo guarda los píxeles del canvas, no el CSS de la página.
 */

/** Lo que se usa de un contexto 2D: así se prueba sin un canvas real. */
export type Canvas2D = Pick<CanvasRenderingContext2D, 'filter' | 'globalAlpha' | 'imageSmoothingEnabled' | 'fillStyle'
  | 'save' | 'restore' | 'fillRect' | 'translate' | 'scale' | 'drawImage'>;

export interface FrameSize { width: number; height: number }

export function composeFrame(ctx: Canvas2D, { width, height }: FrameSize, scene: CanvasImageSource,
  frozen: CanvasImageSource | null, f: SequenceFrame): void {
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
  }
  ctx.restore();
}
