'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import { MODULE_THEMES, moduleForPath } from '@/lib/moduleThemes';
import type { ModuleId } from '@/lib/moduleThemes';
import { paintModuleBackdrop } from './moduleBackdropCanvas';

const MAX_PIXEL_RATIO = 2;

function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function BackdropCanvas({ module }: { module: ModuleId }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isNight = useTheme().resolved === 'dark';

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!container || !canvas || !ctx) return;

    const draw = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      resizeCanvas(canvas, ctx, width, height);
      paintModuleBackdrop(ctx, { width, height, theme: MODULE_THEMES[module], isNight });
    };
    draw();
    const observer = new ResizeObserver(() => window.requestAnimationFrame(draw));
    observer.observe(container);
    return () => observer.disconnect();
  }, [module, isNight]);

  return (
    <div
      ref={containerRef}
      data-testid="module-backdrop"
      data-module={module}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}

/** Fondo del módulo de la ruta actual. Su contenedor debe aislar el apilamiento (`relative isolate`). */
export function ModuleBackdrop() {
  const moduleId = moduleForPath(usePathname());
  return moduleId ? <BackdropCanvas module={moduleId} /> : null;
}
