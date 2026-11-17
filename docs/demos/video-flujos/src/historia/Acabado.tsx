// Acabado de la historia: grano de papel y gradación de color por escena (ideas de las demos de
// papel recortado y pintura procedural). Va sobre la imagen, no sobre los subtítulos.
import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import type { EscenaId } from '../guion';
import { ALTO, BANDA, COLOR } from '../tema';
import { FRAMES_TRANSICION, type Linea } from '../tiempos';

/** Tinte de cada escena: color y opacidad del velo en modo «soft-light». */
const TINTE: Partial<Record<EscenaId, { color: string; fuerza: number }>> = {
  manana: { color: COLOR.blanco, fuerza: 0.18 },
  hoy: { color: COLOR.borde, fuerza: 0.22 },
  aparece: { color: COLOR.arena, fuerza: 0.12 },
  solucion: { color: COLOR.arena, fuerza: 0.22 },
  resultado: { color: COLOR.arena, fuerza: 0.28 },
};

/** Cuánto pesa cada escena en este cuadro: así el tinte cambia en la transición, sin saltos. */
function pesos(linea: Linea, frame: number): { id: EscenaId; peso: number }[] {
  return linea.escenas.map((e, i) => {
    const entra = i === 0 ? 1 : interpolate(frame, [e.desde - FRAMES_TRANSICION, e.desde], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const siguiente = linea.escenas[i + 1];
    const sale = siguiente ? interpolate(frame, [siguiente.desde - FRAMES_TRANSICION, siguiente.desde], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
    return { id: e.id, peso: Math.min(entra, sale) };
  });
}

export const Acabado: React.FC<{ linea: Linea; frame: number }> = ({ linea, frame }) => {
  // El grano cambia cada 2 cuadros: textura viva, como papel filmado.
  const semilla = Math.floor(frame / 2) % 97;
  return (
    <AbsoluteFill style={{ height: ALTO - BANDA, pointerEvents: 'none' }}>
      {pesos(linea, frame).map(({ id, peso }) => {
        const t = TINTE[id];
        return t && peso > 0 ? <AbsoluteFill key={id} style={{ background: t.color, opacity: t.fuerza * peso, mixBlendMode: 'soft-light' }} /> : null;
      })}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.09 }}>
        <filter id="grano">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={semilla} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grano)" />
      </svg>
      {/* Viñeta suave: lleva la mirada al centro. */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%)' }} />
    </AbsoluteFill>
  );
};
