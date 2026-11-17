// Destello cálido sobre un corte, como una fuga de luz de cinta. Propio: el lightLeak de
// @remotion/effects 4.0.540 se dibuja con WebGPU, que el navegador sin pantalla del render no
// garantiza; este es CSS puro y da el mismo cuadro en cada render.
import React from 'react';
import { AbsoluteFill, interpolate, random } from 'remotion';
import { ALTO, BANDA } from '../tema';

const CUADROS = 26;
const COLORES = ['255,184,104', '255,138,91', '255,226,168'];

/** Intensidad 0..1 del destello alrededor del cuadro del corte. */
export function intensidadDestello(frame: number, corte: number): number {
  return interpolate(frame, [corte - CUADROS / 2, corte - 2, corte + 4, corte + CUADROS / 2], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

export const Destello: React.FC<{ frame: number; corte: number; semilla: string }> = ({ frame, corte, semilla }) => {
  const k = intensidadDestello(frame, corte);
  if (k <= 0) return null;
  // Las manchas crecen en su lugar: sin deslizarse de lado a lado.
  const crece = interpolate(frame, [corte - CUADROS / 2, corte + CUADROS / 2], [0.8, 1.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ height: ALTO - BANDA, pointerEvents: 'none', mixBlendMode: 'screen', opacity: 0.8 * k }}>
      {COLORES.map((c, i) => {
        const x = 15 + random(`${semilla}-x${i}`) * 70;
        const y = 10 + random(`${semilla}-y${i}`) * 60;
        const r = (35 + random(`${semilla}-r${i}`) * 30) * crece;
        return <AbsoluteFill key={i} style={{ background: `radial-gradient(circle at ${x}% ${y}%, rgba(${c},0.95) 0%, rgba(${c},0.45) ${r * 0.45}%, rgba(${c},0) ${r}%)` }} />;
      })}
    </AbsoluteFill>
  );
};
