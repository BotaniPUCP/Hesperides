// Capa que da peso a los golpes: sacude la escena, separa los canales R/B, lanza partículas y,
// en los golpes fuertes, mete un cuadro blanco. No toca subtítulos, voz ni música.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ALTO, BANDA, COLOR } from '../tema';
import { efectoDeGolpes, particulas, type Golpe } from './impacto';

const ID_FILTRO = 'separacion-cromatica';

/** R corrido a la derecha, B a la izquierda, G quieto; se suman con «screen» (canales disjuntos). */
const FiltroCromatico: React.FC<{ dx: number }> = ({ dx }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <filter id={ID_FILTRO} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feOffset in="r" dx={dx} dy={0} result="r2" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feOffset in="b" dx={-dx} dy={0} result="b2" />
      <feBlend mode="screen" in="r2" in2="g" result="rg" />
      <feBlend mode="screen" in="rg" in2="b2" />
    </filter>
  </svg>
);

export const CapaDeGolpes: React.FC<{ golpes: Golpe[]; frame: number; children: React.ReactNode }> = ({ golpes, frame, children }) => {
  const e = efectoDeGolpes(golpes, frame);
  const cromatica = e.cromatica > 0.3;
  // Un poco de zoom mientras sacude: así no se ven los bordes del cuadro.
  const zoom = 1 + (Math.abs(e.x) + Math.abs(e.y)) / 500;
  // Sin sacudida no hay transformación: las capturas quedan en píxeles exactos bajo el filtro.
  const transform = zoom === 1 && e.giro === 0 ? undefined : `translate(${Math.round(e.x * 2) / 2}px, ${Math.round(e.y * 2) / 2}px) rotate(${e.giro}deg) scale(${zoom})`;
  return (
    <AbsoluteFill style={{ height: ALTO - BANDA, overflow: 'hidden' }}>
      {cromatica ? <FiltroCromatico dx={Math.round(e.cromatica)} /> : null}
      <AbsoluteFill style={{ transform, filter: cromatica ? `url(#${ID_FILTRO})` : undefined }}>
        {children}
        <svg width={1920} height={ALTO - BANDA} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
          {golpes.flatMap((g) =>
            particulas(g.id, frame - g.frame, g, { hacia: g.hacia }).map((p) => (
              <circle key={`${g.id}${p.i}`} cx={p.x} cy={p.y} r={p.r} fill={COLOR[g.colores[p.i % g.colores.length]]} stroke={COLOR.borde} strokeWidth={2} opacity={p.opacidad} />
            )),
          )}
        </svg>
      </AbsoluteFill>
      {e.blanco > 0 ? <AbsoluteFill style={{ background: COLOR.blanco, opacity: e.blanco }} /> : null}
    </AbsoluteFill>
  );
};
