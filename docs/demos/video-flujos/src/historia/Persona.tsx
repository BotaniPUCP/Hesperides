// Personas de la historia en el mismo estilo plano de Hespo: contorno verde oscuro, formas redondas.
import React from 'react';
import { COLOR } from '../tema';
import { enDos } from './enDos';

/** Solo para personas: piel, pelo y ropa que la paleta de marca no tiene. */
export const PIEL = { julio: '#C98E62', jefe: '#E8B791', podador: '#B57F55', peaton: '#DDA77E' } as const;
const PELO = { canas: '#D8D4CB', oscuro: '#3A2B22' };
const PANTALON = '#3E4A44';

export type Quien = 'julio' | 'jefe' | 'podador' | 'peaton';
export type Gesto = 'neutral' | 'feliz' | 'preocupado' | 'sorpresa' | 'pensativo';
export type Objeto = 'nada' | 'celular' | 'podadora';

export type PoseP = {
  /** Grados: 0 = brazo colgando, 90 = horizontal, 180 = arriba. */
  brazoI: number;
  brazoD: number;
  /** Grados, positivo = hacia adelante. */
  inclina?: number;
  /** −1..1: hacia dónde mira (horizontal) y arriba/abajo. */
  miraX?: number;
  miraY?: number;
};

export type PropsPersona = {
  quien: Quien;
  x: number;
  sueloY: number;
  escala: number;
  frame: number;
  pose: PoseP;
  gesto?: Gesto;
  /** 1 mira a la derecha, −1 a la izquierda. */
  mira?: 1 | -1;
  /** Caminata: distancia recorrida en px de video y cuánto camina (0 a 1). */
  andar?: { distancia: number; w: number };
  sentado?: boolean;
  objeto?: Objeto;
  /** Color de camisa del peatón. */
  ropa?: string;
};

const PASO = 22;

function pierna(distancia: number, w: number, desfase: number) {
  const p = (((distancia / (4 * PASO) + desfase) % 1) + 1) % 1;
  if (p < 0.5) return { dx: w * PASO * (1 - 4 * p), alza: 0 };
  const q = (p - 0.5) / 0.5;
  return { dx: w * (-PASO + 2 * PASO * (0.5 - 0.5 * Math.cos(Math.PI * q))), alza: w * 14 * Math.sin(Math.PI * q) };
}

function parpadeo(frame: number, semilla: number): number {
  const k = (frame + semilla) % 110;
  return k < 4 ? [0.5, 1, 1, 0.4][k] : 0;
}

const Brazo: React.FC<{ lado: 1 | -1; grados: number; manga: string; piel: string; objeto?: Objeto }> = ({ lado, grados, manga, piel, objeto }) => {
  const hombro = { x: 44 * lado, y: -212 };
  const r = (grados * Math.PI) / 180;
  const d = { x: lado * Math.sin(r), y: Math.cos(r) };
  const largo = 92;
  const mano = { x: hombro.x + d.x * largo, y: hombro.y + d.y * largo };
  const codo = { x: hombro.x + d.x * largo * 0.5 + lado * 7, y: hombro.y + d.y * largo * 0.5 + 4 };
  const mangaFin = { x: hombro.x + d.x * largo * 0.45, y: hombro.y + d.y * largo * 0.45 };
  return (
    <g>
      <path d={`M${hombro.x} ${hombro.y} Q${codo.x} ${codo.y} ${mano.x} ${mano.y}`} fill="none" stroke={COLOR.borde} strokeWidth={22} strokeLinecap="round" />
      <path d={`M${hombro.x} ${hombro.y} Q${codo.x} ${codo.y} ${mano.x} ${mano.y}`} fill="none" stroke={piel} strokeWidth={13} strokeLinecap="round" />
      <path d={`M${hombro.x} ${hombro.y} L${mangaFin.x} ${mangaFin.y}`} fill="none" stroke={manga} strokeWidth={16} strokeLinecap="round" />
      {objeto === 'celular' ? (
        <rect x={mano.x - 12} y={mano.y - 34} width={24} height={40} rx={5} fill={COLOR.negro} stroke={COLOR.borde} strokeWidth={3} transform={`rotate(${-lado * 12} ${mano.x} ${mano.y})`} />
      ) : null}
      {objeto === 'podadora' ? (
        <g>
          <line x1={mano.x - 30 * d.x} y1={mano.y + 40} x2={mano.x + 120 * lado} y2={mano.y - 170} stroke={COLOR.borde} strokeWidth={7} strokeLinecap="round" />
          <path d={`M${mano.x + 120 * lado} ${mano.y - 170} l${12 * lado} -18 l${10 * lado} 10 z`} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={3} />
        </g>
      ) : null}
      <circle cx={mano.x} cy={mano.y} r={12} fill={piel} stroke={COLOR.borde} strokeWidth={5} />
    </g>
  );
};

const Cara: React.FC<{ quien: Quien; gesto: Gesto; frame: number; miraX: number; miraY: number; semilla: number }> = ({ quien, gesto, frame, miraX, miraY, semilla }) => {
  const cy = -292;
  const cierre = parpadeo(frame, semilla);
  const ojoY = cy - 4 + miraY * 4;
  const ojoR = gesto === 'sorpresa' ? 8 : 6.5;
  const ceja = { neutral: 0, feliz: -4, preocupado: 0, sorpresa: -10, pensativo: 0 }[gesto];
  const dx = miraX * 9;
  const ojo = (lx: number) =>
    gesto === 'feliz' ? (
      <path d={`M${lx - 8} ${ojoY + 3} Q${lx} ${ojoY - 7} ${lx + 8} ${ojoY + 3}`} fill="none" stroke={COLOR.borde} strokeWidth={5} strokeLinecap="round" />
    ) : (
      <ellipse cx={lx} cy={ojoY} rx={ojoR * 0.85} ry={Math.max(1.5, ojoR * (1 - cierre))} fill={COLOR.negro} />
    );
  const boca =
    gesto === 'feliz' ? (
      <path d={`M${dx - 16} ${cy + 26} Q${dx} ${cy + 46} ${dx + 16} ${cy + 26} Z`} fill={COLOR.borde} />
    ) : gesto === 'sorpresa' ? (
      <ellipse cx={dx} cy={cy + 34} rx={7} ry={9} fill={COLOR.borde} />
    ) : gesto === 'preocupado' ? (
      <path d={`M${dx - 12} ${cy + 36} Q${dx} ${cy + 27} ${dx + 12} ${cy + 36}`} fill="none" stroke={COLOR.borde} strokeWidth={5} strokeLinecap="round" />
    ) : gesto === 'pensativo' ? (
      <path d={`M${dx - 6} ${cy + 33} L${dx + 12} ${cy + 30}`} fill="none" stroke={COLOR.borde} strokeWidth={5} strokeLinecap="round" />
    ) : (
      <path d={`M${dx - 12} ${cy + 28} Q${dx} ${cy + 38} ${dx + 12} ${cy + 28}`} fill="none" stroke={COLOR.borde} strokeWidth={5} strokeLinecap="round" />
    );
  // Preocupado: el extremo interior de la ceja sube.
  const cejaI = gesto === 'preocupado' ? 'M-30 -312 L-10 -318' : `M-30 ${-314 + ceja} Q-20 ${-320 + ceja} -10 ${-314 + ceja}`;
  const cejaD = gesto === 'preocupado' ? 'M30 -312 L10 -318' : gesto === 'pensativo' ? 'M30 -322 Q20 -326 10 -318' : `M30 ${-314 + ceja} Q20 ${-320 + ceja} 10 ${-314 + ceja}`;
  return (
    <g>
      <g transform={`translate(${dx} 0)`}>
        {ojo(-19)}
        {ojo(19)}
        <path d={cejaI} fill="none" stroke={quien === 'julio' ? PELO.canas : COLOR.borde} strokeWidth={6} strokeLinecap="round" />
        <path d={cejaD} fill="none" stroke={quien === 'julio' ? PELO.canas : COLOR.borde} strokeWidth={6} strokeLinecap="round" />
        <path d={`M-3 ${cy + 8} Q4 ${cy + 16} -2 ${cy + 18}`} fill="none" stroke={COLOR.borde} strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
        <ellipse cx={-30} cy={cy + 18} rx={9} ry={5} fill="#E7907A" opacity={0.45} />
        <ellipse cx={30} cy={cy + 18} rx={9} ry={5} fill="#E7907A" opacity={0.45} />
        {quien === 'jefe' ? (
          <g fill="none" stroke={COLOR.borde} strokeWidth={3.5}>
            <circle cx={-19} cy={ojoY} r={14} />
            <circle cx={19} cy={ojoY} r={14} />
            <path d={`M-5 ${ojoY} L5 ${ojoY}`} />
          </g>
        ) : null}
        {quien === 'julio' ? <path d={`M-20 ${cy + 26} Q0 ${cy + 14} 20 ${cy + 26} Q0 ${cy + 22} -20 ${cy + 26} Z`} fill={PELO.canas} stroke={COLOR.borde} strokeWidth={3} /> : null}
      </g>
      {boca}
    </g>
  );
};

const Cabeza: React.FC<{ quien: Quien; piel: string; children: React.ReactNode }> = ({ quien, piel, children }) => {
  const cy = -292;
  return (
    <g>
      <ellipse cx={-50} cy={cy + 6} rx={9} ry={13} fill={piel} stroke={COLOR.borde} strokeWidth={5} />
      <ellipse cx={50} cy={cy + 6} rx={9} ry={13} fill={piel} stroke={COLOR.borde} strokeWidth={5} />
      <ellipse cx={0} cy={cy} rx={50} ry={54} fill={piel} stroke={COLOR.borde} strokeWidth={5} />
      {quien === 'julio' ? (
        <g>
          <path d={`M-48 ${cy - 6} Q-50 ${cy - 30} -36 ${cy - 34} L36 ${cy - 34} Q50 ${cy - 30} 48 ${cy - 6} Q40 ${cy - 22} 0 ${cy - 24} Q-40 ${cy - 22} -48 ${cy - 6} Z`} fill={PELO.canas} stroke={COLOR.borde} strokeWidth={4} />
          {/* Sombrero de ala ancha */}
          <ellipse cx={0} cy={cy - 34} rx={86} ry={16} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={5} />
          <path d={`M-44 ${cy - 36} Q-42 ${cy - 86} 0 ${cy - 88} Q42 ${cy - 86} 44 ${cy - 36} Z`} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={5} />
          <path d={`M-43 ${cy - 46} Q0 ${cy - 54} 43 ${cy - 46}`} fill="none" stroke={COLOR.verde} strokeWidth={9} />
        </g>
      ) : null}
      {quien === 'jefe' ? (
        <path d={`M-50 ${cy - 4} Q-56 ${cy - 62} 0 ${cy - 60} Q52 ${cy - 62} 50 ${cy - 6} Q44 ${cy - 34} 14 ${cy - 38} Q-20 ${cy - 30} -50 ${cy - 4} Z`} fill={PELO.oscuro} stroke={COLOR.borde} strokeWidth={4} />
      ) : null}
      {quien === 'podador' ? (
        <g>
          <path d={`M-54 ${cy - 14} Q-52 ${cy - 74} 0 ${cy - 76} Q52 ${cy - 74} 54 ${cy - 14} Z`} fill={COLOR.hoja} stroke={COLOR.borde} strokeWidth={5} />
          <rect x={-62} y={cy - 20} width={124} height={12} rx={6} fill={COLOR.hoja} stroke={COLOR.borde} strokeWidth={5} />
        </g>
      ) : null}
      {quien === 'peaton' ? (
        <path d={`M-50 ${cy - 4} Q-52 ${cy - 58} 0 ${cy - 58} Q52 ${cy - 58} 50 ${cy - 4} Q30 ${cy - 30} 0 ${cy - 32} Q-30 ${cy - 30} -50 ${cy - 4} Z`} fill={PELO.oscuro} stroke={COLOR.borde} strokeWidth={4} />
      ) : null}
      {children}
    </g>
  );
};

export const Persona: React.FC<PropsPersona> = ({ quien, x, sueloY, escala, frame: cuadro, pose, gesto = 'neutral', mira = 1, andar, sentado = false, objeto = 'nada', ropa }) => {
  // Las personas se animan «en dos»: el dibujo cambia cada 2 cuadros.
  const frame = enDos(cuadro);
  const piel = PIEL[quien];
  const camisa = quien === 'jefe' ? COLOR.blanco : quien === 'peaton' ? ropa ?? COLOR.hoja : COLOR.blanco;
  const chaleco = quien === 'julio' ? COLOR.verde : quien === 'podador' ? COLOR.arena : null;
  const semilla = quien.length * 17;
  const w = andar?.w ?? 0;
  const dist = andar?.distancia ?? 0;
  const pI = pierna(dist, w, 0);
  const pD = pierna(dist, w, 0.5);
  const respira = Math.sin((frame + semilla) / 20) * 2;
  const rebote = w * 6 * Math.abs(Math.sin((Math.PI * dist) / (2 * PASO)));
  const caderaY = sentado ? -96 : -118;

  const piernas = sentado ? (
    <g stroke={COLOR.borde} strokeLinecap="round" fill="none">
      {[-1, 1].map((l) => (
        <g key={l}>
          <path d={`M${16 * l} ${caderaY} L${16 * l + 64} ${caderaY} L${16 * l + 66} -10`} strokeWidth={22} />
          <path d={`M${16 * l} ${caderaY} L${16 * l + 64} ${caderaY} L${16 * l + 66} -10`} stroke={PANTALON} strokeWidth={13} />
          <ellipse cx={16 * l + 76} cy={-6} rx={20} ry={9} fill={COLOR.borde} stroke="none" />
        </g>
      ))}
    </g>
  ) : (
    <g>
      {[
        { l: -1, p: pI },
        { l: 1, p: pD },
      ].map(({ l, p }) => (
        <g key={l}>
          <path d={`M${15 * l} ${caderaY} L${15 * l + p.dx} ${-12 - p.alza}`} stroke={COLOR.borde} strokeWidth={24} strokeLinecap="round" />
          <path d={`M${15 * l} ${caderaY} L${15 * l + p.dx} ${-12 - p.alza}`} stroke={PANTALON} strokeWidth={15} strokeLinecap="round" />
          <ellipse cx={15 * l + p.dx + 8} cy={-7 - p.alza} rx={22} ry={10} fill={COLOR.borde} />
        </g>
      ))}
    </g>
  );

  return (
    <svg
      viewBox="-170 -420 340 440"
      width={340 * escala}
      height={440 * escala}
      style={{ position: 'absolute', left: x - 170 * escala, top: sueloY - 420 * escala, overflow: 'visible' }}
    >
      {!sentado ? <ellipse cx={0} cy={0} rx={70} ry={10} fill={COLOR.negro} opacity={0.16} /> : null}
      <g transform={`scale(${mira} 1)`}>
        <g transform={`translate(0 ${-rebote})`}>
          {piernas}
          <g transform={`translate(0 ${sentado ? 22 : 0}) rotate(${pose.inclina ?? 0} 0 ${caderaY})`}>
            <g transform={`translate(0 ${respira * 0.5})`}>
              <Brazo lado={-1} grados={pose.brazoI} manga={chaleco ?? camisa} piel={piel} />
              {/* Torso */}
              <rect x={-52} y={-236} width={104} height={128} rx={34} fill={camisa} stroke={COLOR.borde} strokeWidth={5} />
              {chaleco ? (
                <g>
                  <path d="M-50 -222 Q-52 -150 -46 -112 L-12 -112 L-14 -226 Z" fill={chaleco} stroke={COLOR.borde} strokeWidth={4} />
                  <path d="M50 -222 Q52 -150 46 -112 L12 -112 L14 -226 Z" fill={chaleco} stroke={COLOR.borde} strokeWidth={4} />
                  {quien === 'podador' ? <path d="M-48 -160 L48 -160" stroke={COLOR.blanco} strokeWidth={7} /> : <rect x={20} y={-196} width={20} height={16} rx={3} fill="none" stroke={COLOR.hoja} strokeWidth={3} />}
                </g>
              ) : null}
              {quien === 'jefe' ? <path d="M0 -232 L-8 -214 L0 -150 L8 -214 Z" fill={COLOR.verde} stroke={COLOR.borde} strokeWidth={3} /> : null}
              <rect x={-54} y={-122} width={108} height={14} rx={7} fill={COLOR.borde} />
              <g transform={`translate(0 ${respira * 0.4}) rotate(${(pose.inclina ?? 0) * 0.4} 0 -240)`}>
                <Cabeza quien={quien} piel={piel}>
                  <Cara quien={quien} gesto={gesto} frame={frame} miraX={pose.miraX ?? 0} miraY={pose.miraY ?? 0} semilla={semilla} />
                </Cabeza>
              </g>
              <Brazo lado={1} grados={pose.brazoD} manga={chaleco ?? camisa} piel={piel} objeto={objeto} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};
