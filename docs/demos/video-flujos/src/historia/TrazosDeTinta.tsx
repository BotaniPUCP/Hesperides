// Trazos de tinta que se dibujan solos: marcos de celular y laptop, flechas y subrayados.
import React, { useId } from 'react';
import { random } from 'remotion';
import { COLOR } from '../tema';
import { bezier, desplazamientoGuion, recorrido, segmentosDeTinta, type Punto } from './tinta';

/** Gota de tinta donde la pluma se apoya o se levanta. */
const Gota: React.FC<{ p: Punto; r: number; semilla: string; color: string }> = ({ p, r, semilla, color }) => {
  const k = 0.8 + 0.4 * random(`${semilla}-r`);
  const a = random(`${semilla}-a`) * Math.PI * 2;
  return (
    <g fill={color}>
      <circle cx={p[0]} cy={p[1]} r={r * k} />
      <circle cx={p[0] + Math.cos(a) * r * 1.6} cy={p[1] + Math.sin(a) * r * 1.6} r={r * 0.35 * k} />
    </g>
  );
};

/**
 * Un trazo que se dibuja solo: el cuerpo (cuadriláteros de ancho variable y tinta según la
 * velocidad) se revela con una máscara cuyo stroke-dashoffset baja del largo total a 0.
 */
export const TrazoTinta: React.FC<{ puntos: Punto[]; progreso: number; semilla: string; ancho?: number; color?: string; gotas?: boolean }> = ({
  puntos,
  progreso,
  semilla,
  ancho = 7,
  color = COLOR.borde,
  gotas = true,
}) => {
  const id = useId();
  if (progreso <= 0 || puntos.length < 2) return null;
  const r = recorrido(puntos);
  const d = `M${puntos.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L')}`;
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-5000} y={-5000} width={10000} height={10000}>
          <path d={d} fill="none" stroke="#fff" strokeWidth={ancho * 1.45 + 6} strokeLinejoin="round" strokeDasharray={`${r.total} ${r.total + 10}`} strokeDashoffset={desplazamientoGuion(r.total, progreso)} />
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        {segmentosDeTinta(r, { semilla, ancho }).map((s, i) => (
          <polygon key={i} points={s.puntos.map((p) => p.join(',')).join(' ')} fill={color} fillOpacity={s.opacidad} />
        ))}
      </g>
      {gotas ? <Gota p={puntos[0]} r={ancho * 0.75} semilla={`${semilla}-ini`} color={color} /> : null}
      {gotas && progreso >= 1 ? <Gota p={puntos[puntos.length - 1]} r={ancho * 0.7} semilla={`${semilla}-fin`} color={color} /> : null}
    </g>
  );
};

/** Flecha a mano: primero el cuerpo curvo, después las dos alas de la punta. */
export const FlechaTinta: React.FC<{ desde: Punto; hasta: Punto; curva?: number; progreso: number; semilla: string; ancho?: number; color?: string }> = ({
  desde,
  hasta,
  curva = 0.25,
  progreso,
  semilla,
  ancho = 7,
  color = COLOR.borde,
}) => {
  const dx = hasta[0] - desde[0];
  const dy = hasta[1] - desde[1];
  const n: Punto = [-dy * curva, dx * curva];
  const c1: Punto = [desde[0] + dx / 3 + n[0], desde[1] + dy / 3 + n[1]];
  const c2: Punto = [desde[0] + (2 * dx) / 3 + n[0], desde[1] + (2 * dy) / 3 + n[1]];
  const cuerpo = bezier(desde, c1, c2, hasta);
  const ang = Math.atan2(hasta[1] - c2[1], hasta[0] - c2[0]);
  const ala = (s: 1 | -1): Punto[] => {
    const a = ang + Math.PI + s * 0.5;
    return bezier(hasta, hasta, [hasta[0] + Math.cos(a) * 20, hasta[1] + Math.sin(a) * 20], [hasta[0] + Math.cos(a) * 38, hasta[1] + Math.sin(a) * 38]);
  };
  const pc = Math.min(1, progreso / 0.75);
  const pa = Math.max(0, Math.min(1, (progreso - 0.75) / 0.25));
  return (
    <g>
      <TrazoTinta puntos={cuerpo} progreso={pc} semilla={semilla} ancho={ancho} color={color} gotas={false} />
      <TrazoTinta puntos={ala(1)} progreso={pa} semilla={`${semilla}-a1`} ancho={ancho} color={color} gotas={false} />
      <TrazoTinta puntos={ala(-1)} progreso={pa} semilla={`${semilla}-a2`} ancho={ancho} color={color} />
    </g>
  );
};

/** Subrayado a mano, levemente ondulado. */
export const SubrayadoTinta: React.FC<{ x: number; y: number; largo: number; progreso: number; semilla: string; color?: string }> = ({ x, y, largo, progreso, semilla, color = COLOR.verde }) => (
  <TrazoTinta puntos={bezier([x, y + 3], [x + largo * 0.3, y - 6], [x + largo * 0.7, y + 8], [x + largo, y - 2])} progreso={progreso} semilla={semilla} ancho={6} color={color} />
);
