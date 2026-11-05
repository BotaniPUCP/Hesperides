'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/hooks/useTheme';

/** Pseudoaleatorio con semilla idéntico al de backdrop.ts: estrellas estables */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Fondo con la arquitectura gráfica exacta del mapa interactivo 3D de Hespérides (backdrop.ts),
 * adaptado cromáticamente a la gama verde institucional del catastro para la ficha del ejemplar.
 * - Modo Claro (día): degradado botánico luminoso con la cuadrícula de triángulos escalonados y fade vertical.
 * - Modo Oscuro (noche): cielo nocturno de bosque profundo con estrellas pseudoaleatorias y trama esmeralda sutil.
 */
export function SpecimenBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { resolved } = useTheme();
  const isNight = resolved === 'dark';

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;

    const draw = () => {
      if (!ctx || !container || !canvas) return;
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. Degradado base equivalente al cielo del mapa 3D (backdrop.ts) en tonos verdes
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      const stops = isNight
        ? ['#020B05', '#05180D', '#0A2817', '#123C24']
        : ['#0D7344', '#10B981', '#6EE7B7', '#F0FDF4'];
      [0, 0.34, 0.68, 1].forEach((p, i) => bg.addColorStop(p, stops[i]));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 2. Trama geométrica de triángulos idéntica al mapa interactivo (backdrop.ts)
      const tw = isNight ? 34 : 42;
      const th = isNight ? 30 : 36;
      ctx.lineWidth = 1;

      for (let row = -2; row < h / th + 3; row++) {
        const y0 = row * th;
        const yn = Math.max(0, Math.min(1, y0 / h));
        const fade = isNight
          ? 0.5 + 0.5 * Math.pow(1 - Math.abs(yn - 0.52) / 0.52, 1.35)
          : Math.pow(1 - yn, 0.8);

        for (let col = -2; col < w / tw + 3; col++) {
          const x0 = col * tw + (row & 1) * (tw / 2);
          const up = ((row + col) & 1) === 0;

          ctx.fillStyle = isNight
            ? `rgba(52, 211, 153, ${((row + col) % 5 === 0 ? 0.03 : 0.015) * fade})`
            : `rgba(255, 255, 255, ${(0.06 + ((row + col) % 5 === 0 ? 0.025 : 0)) * fade})`;

          ctx.strokeStyle = isNight
            ? `rgba(52, 211, 153, ${0.12 * fade})`
            : `rgba(255, 255, 255, ${0.09 * fade})`;

          ctx.beginPath();
          if (up) {
            ctx.moveTo(x0, y0 + th);
            ctx.lineTo(x0 + tw / 2, y0);
            ctx.lineTo(x0 + tw, y0 + th);
          } else {
            ctx.moveTo(x0, y0);
            ctx.lineTo(x0 + tw / 2, y0 + th);
            ctx.lineTo(x0 + tw, y0);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // 3. De noche: estrellas sutiles estables (igual que backdrop.ts)
      if (isNight) {
        const rnd = seeded(0x6d2b79f5);
        for (let i = 0; i < 180; i++) {
          const x = rnd() * w;
          const y = rnd() * h * 0.7;
          const r = 0.5 + rnd() * 1.5;
          const a = 0.2 + rnd() * 0.6;
          ctx.fillStyle = `rgba(245, 248, 255, ${a})`;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    draw();

    // Redibujar con precisión ante cambios de tamaño de pantalla o contenedor
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(draw);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isNight]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute -inset-4 sm:-inset-6 -z-10 rounded-3xl overflow-hidden select-none transition-colors duration-300"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full block" />
      {/* Sombra de viñeta suave para fusionar la atmósfera hacia la base */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/30 dark:from-[#020B05]/60 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
