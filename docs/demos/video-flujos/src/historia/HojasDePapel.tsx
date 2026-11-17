// Dibujo de cada hoja de papel recortado y cómo se usa en la escena. La composición `HojaDeFondo`
// la renderiza sola, con fondo transparente, para guardarla como PNG (scripts/fondos.ts).
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { COLOR } from '../tema';
import type { Toma } from './camara';
import { Arbol, Edificios, HORIZONTE, SUELO } from './decorado';
import { ALTO_HOJA, ANCHO_HOJA, hoja, MARGEN_HOJA as M, paralaje, rutaHoja, type IdHoja } from './papel';

/** La toma de la cámara en este cuadro, para el paralaje de las hojas. */
export const TomaContexto = createContext<Toma>({ x: 960, y: 470, zoom: 1, giro: 0 });

const ANCHO = 1920;
const ALTO = 940;
/** Arriba del piso de la oficina. */
export const PISO_OFICINA = 770;

/**
 * Borde ondulado (ruido fijo, semilla 11) y una sola sombra suave para todas las hojas. Como se
 * hornea en el PNG, la textura del corte viaja con la hoja.
 */
const FiltroPapel: React.FC = () => (
  <filter id="papel" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves={2} seed={11} result="ruido" />
    <feDisplacementMap in="SourceGraphic" in2="ruido" scale={5} xChannelSelector="R" yChannelSelector="G" result="corte" />
    <feGaussianBlur in="corte" stdDeviation={5} result="difusa" />
    <feOffset in="difusa" dx={3} dy={4} result="corrida" />
    <feFlood floodColor={COLOR.borde} floodOpacity={0.35} />
    <feComposite in2="corrida" operator="in" result="sombra" />
    <feMerge>
      <feMergeNode in="sombra" />
      <feMergeNode in="corte" />
    </feMerge>
  </filter>
);

const Mata: React.FC<{ x: number; y: number; r: number; color: string }> = ({ x, y, r, color }) => (
  <g stroke={COLOR.borde} strokeWidth={5} fill={color}>
    <circle cx={x - r * 0.7} cy={y + r * 0.2} r={r * 0.75} />
    <circle cx={x + r * 0.7} cy={y + r * 0.25} r={r * 0.7} />
    <circle cx={x} cy={y} r={r} />
  </g>
);

/** El contenido de una hoja, en coordenadas de la escena (1920×940), con margen alrededor. */
const DibujoHoja: React.FC<{ id: IdHoja }> = ({ id }) => {
  switch (id) {
    case 'colinas-lejos':
      return <path d={`M${-M} ${HORIZONTE + 60} L${-M} ${HORIZONTE - 20} Q-100 ${HORIZONTE - 150} 200 ${HORIZONTE - 110} T600 ${HORIZONTE - 40} T1400 ${HORIZONTE - 60} T2000 ${HORIZONTE - 90} T${ANCHO + M} ${HORIZONTE - 30} L${ANCHO + M} ${HORIZONTE + 60} Z`} fill={COLOR.hoja} />;
    case 'colinas-cerca':
      return <path d={`M${-M} ${HORIZONTE + 60} L${-M} ${HORIZONTE - 10} Q400 ${HORIZONTE - 80} 900 ${HORIZONTE - 10} T1700 ${HORIZONTE - 30} T${ANCHO + M} ${HORIZONTE} L${ANCHO + M} ${HORIZONTE + 60} Z`} fill={COLOR.cuerpo} />;
    case 'edificios':
      return (
        <g>
          <rect x={-M + 40} y={HORIZONTE - 130} width={200} height={150} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={4} />
          <Edificios />
        </g>
      );
    case 'suelo':
      return (
        <g>
          <rect x={-M} y={HORIZONTE} width={ANCHO + 2 * M} height={ALTO - HORIZONTE + M} fill={COLOR.cuerpo} />
          <rect x={-M} y={HORIZONTE} width={ANCHO + 2 * M} height={60} fill={COLOR.hoja} opacity={0.35} />
          <rect x={-M} y={SUELO - 40} width={ANCHO + 2 * M} height={74} fill={COLOR.arena} />
          {/* Matitas de pasto recortadas */}
          {Array.from({ length: 22 }, (_, i) => {
            const x = -M + 60 + i * 120 + (i % 3) * 23;
            const y = HORIZONTE + 90 + ((i * 37) % 80);
            return <path key={i} d={`M${x} ${y} l8 -22 l6 18 l8 -26 l6 30 Z`} fill={COLOR.hoja} />;
          })}
        </g>
      );
    case 'matas':
      return (
        <g>
          <Mata x={-160} y={ALTO + 10} r={70} color={COLOR.hoja} />
          <Mata x={90} y={ALTO + 30} r={56} color={COLOR.cuerpo} />
          <Mata x={1780} y={ALTO + 28} r={58} color={COLOR.hoja} />
          <Mata x={2040} y={ALTO + 12} r={72} color={COLOR.cuerpo} />
        </g>
      );
    case 'pared':
      return (
        <g>
          <rect x={-M} y={-M} width={ANCHO + 2 * M} height={PISO_OFICINA + M + 10} fill={COLOR.barriga} />
          <rect x={-M} y={PISO_OFICINA - 70} width={ANCHO + 2 * M} height={80} fill={COLOR.blanco} opacity={0.35} />
        </g>
      );
    case 'ventana':
      return (
        <g>
          <rect x={1240} y={120} width={520} height={360} rx={12} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={8} />
          <rect x={1256} y={136} width={488} height={328} fill={COLOR.cuerpo} />
          <Arbol x={1380} y={470} alto={220} />
          <Arbol x={1620} y={470} alto={260} copa={COLOR.cuerpo} />
          <line x1={1500} y1={120} x2={1500} y2={480} stroke={COLOR.borde} strokeWidth={8} />
        </g>
      );
    case 'cuadro':
      return (
        <g>
          <rect x={120} y={120} width={360} height={300} rx={12} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={8} />
          <Arbol x={300} y={410} alto={240} />
        </g>
      );
    case 'piso':
      return (
        <g>
          <rect x={-M} y={PISO_OFICINA} width={ANCHO + 2 * M} height={ALTO - PISO_OFICINA + M} fill={COLOR.arena} />
          <rect x={-M} y={PISO_OFICINA} width={ANCHO + 2 * M} height={8} fill={COLOR.borde} opacity={0.5} />
        </g>
      );
    case 'maceta':
      return (
        <g transform="translate(120 0)">
          <path d={`M-40 ${ALTO - 120} q60 -150 30 -230 q-60 70 -30 230 Z`} fill={COLOR.hoja} stroke={COLOR.borde} strokeWidth={5} />
          <path d={`M0 ${ALTO - 120} q90 -120 140 -170 q-110 20 -140 170 Z`} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={5} />
          <path d={`M-30 ${ALTO - 120} q-60 -90 -120 -110 q40 80 120 110 Z`} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={5} />
          <path d={`M-90 ${ALTO - 125} L90 ${ALTO - 125} L70 ${ALTO + 40} L-70 ${ALTO + 40} Z`} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={6} />
        </g>
      );
  }
};

/** Composición auxiliar: una hoja sola sobre transparente, del tamaño de la hoja con margen. */
export const HojaDeFondo: React.FC<{ hoja: IdHoja }> = ({ hoja: id }) => (
  <svg width={ANCHO_HOJA} height={ALTO_HOJA} viewBox={`0 0 ${ANCHO_HOJA} ${ALTO_HOJA}`} style={{ position: 'absolute', left: 0, top: 0 }}>
    <defs>
      <FiltroPapel />
    </defs>
    <g filter="url(#papel)">
      <g transform={`translate(${M} ${M})`}>
        <DibujoHoja id={id} />
      </g>
    </g>
  </svg>
);

/** Una hoja pre-renderizada en la escena, corrida por el paralaje de la cámara y del paneo. */
export const HojaPapel: React.FC<{ id: IdHoja; corrimiento?: number }> = ({ id, corrimiento = 0 }) => {
  const toma = useContext(TomaContexto);
  const h = hoja(id);
  const p = paralaje(toma, h.factor, corrimiento);
  return (
    <Img
      src={staticFile(rutaHoja(id))}
      style={{ position: 'absolute', left: -M, top: -M, width: ANCHO_HOJA, height: ALTO_HOJA, maxWidth: 'none', opacity: h.opacidad ?? 1, transform: `translate(${p.x}px, ${p.y}px)` }}
    />
  );
};

/** Desplazamiento de un elemento vivo (el sol) con el mismo paralaje que las hojas. */
export function useParalaje(factor: number, corrimiento = 0): { x: number; y: number } {
  return paralaje(useContext(TomaContexto), factor, corrimiento);
}

/**
 * Lo que va fijo en pantalla aunque esté dentro de la escena (tarjetas de texto): deshace la
 * transformación de la cámara, así no se corta con los acercamientos.
 */
export const EnPantalla: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useContext(TomaContexto);
  return (
    <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${t.x}px, ${t.y}px) scale(${1 / t.zoom}) rotate(${-t.giro}deg) translate(-960px, -470px)`, pointerEvents: 'none' }}>
      {children}
    </AbsoluteFill>
  );
};
