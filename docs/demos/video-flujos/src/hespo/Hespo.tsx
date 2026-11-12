import React from 'react';
import { COLOR } from '../tema';
import { formaDeBoca, type Boca } from './boca';
import { parpadeo, type EstadoHespo } from './recorrido';

const ANCHO_VISTA = 360;
const ALTO_VISTA = 380;
const CENTRO_EN_VISTA = 180;
const PIES_EN_VISTA = 363;

const BOCAS: Record<Boca, string> = {
  cerrada: 'M130 194 Q150 214 170 194 Q150 205 130 194 Z',
  media: 'M132 194 Q150 192 168 194 Q166 216 150 216 Q134 216 132 194 Z',
  abierta: 'M126 192 Q150 188 174 192 Q173 230 150 230 Q127 230 126 192 Z',
};
const LENGUA = 'M136 219 Q150 209 164 219 Q158 230 150 230 Q142 230 136 219 Z';

const trazo = { fill: 'none', stroke: COLOR.borde, strokeLinecap: 'round' as const };
const contorno = { stroke: COLOR.borde, strokeWidth: 6, strokeLinejoin: 'round' as const };

/** Claro y con contorno: un brazo oscuro se pierde sobre el fondo verde. */
const Brazo: React.FC<{ d: string }> = ({ d }) => (
  <>
    <path d={d} {...trazo} strokeWidth={17} />
    <path d={d} {...trazo} stroke={COLOR.cuerpo} strokeWidth={8} />
  </>
);

const Ojo: React.FC<{ cx: number; abierto: number }> = ({ cx, abierto }) => (
  <>
    <ellipse cx={cx} cy={166} rx={13} ry={abierto ? 17 : 2.5} fill={COLOR.negro} />
    {abierto ? <circle cx={cx + 5} cy={159} r={5} fill={COLOR.blanco} /> : null}
  </>
);

export const Hespo: React.FC<{ estado: EstadoHespo; frame: number; apertura: number; escala?: number }> = ({
  estado,
  frame,
  apertura,
  escala = 0.8,
}) => {
  const { x, y, mira, pose, articulaciones: a } = estado;
  const boca = formaDeBoca(apertura);
  const abierto = parpadeo(frame);
  const respira = Math.sin(frame / 18) * 1.6;
  // Las hojas siguen al cuerpo con un pequeño retraso.
  const hojas = Math.sin((frame - 6) / 16) * 3;

  return (
    <svg
      viewBox="-30 -40 360 380"
      width={ANCHO_VISTA * escala}
      height={ALTO_VISTA * escala}
      style={{
        position: 'absolute',
        left: x - CENTRO_EN_VISTA * escala,
        top: y - PIES_EN_VISTA * escala,
        overflow: 'visible',
      }}
    >
      <ellipse cx={150} cy={324} rx={78 + a.saltoY * 0.8} ry={10} fill={COLOR.negro} opacity={0.18} />
      <g transform={mira === 1 ? undefined : 'translate(300 0) scale(-1 1)'}>
        <g transform={`translate(0 ${a.saltoY})`}>
          <g transform={`rotate(${a.piernaI} 118 268)`}>
            <path d="M118 268 L114 306" {...trazo} strokeWidth={13} />
            <ellipse cx={108} cy={312} rx={24} ry={11} fill={COLOR.borde} />
          </g>
          <g transform={`rotate(${a.piernaD} 182 268)`}>
            <path d="M182 268 L186 306" {...trazo} strokeWidth={13} />
            <ellipse cx={192} cy={312} rx={24} ry={11} fill={COLOR.borde} />
          </g>
          <g transform={`translate(0 ${respira}) rotate(${a.inclina} 150 200)`}>
            <g transform={`rotate(${a.brazoI} 74 196)`}>
              <Brazo d="M74 196 Q54 216 46 242" />
              <circle cx={44} cy={248} r={13} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={6} />
            </g>
            <g transform={`rotate(${a.brazoD} 226 196)`}>
              <Brazo d="M226 196 Q246 216 254 242" />
              {pose === 'pulgar' ? (
                <rect x={247} y={204} width={18} height={44} rx={9} fill={COLOR.cuerpo} {...contorno} transform={`rotate(${-a.brazoD} 256 248)`} />
              ) : null}
              <circle cx={256} cy={248} r={13} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={6} />
            </g>
            <g transform={`rotate(${hojas} 150 90)`}>
              <path d="M150 98 C150 86 150 76 150 66" {...trazo} strokeWidth={9} />
              <path d="M150 66 C120 30 84 30 62 50 C84 78 124 84 150 66 Z" fill={COLOR.hoja} {...contorno} />
              <path d="M150 66 C125 58 100 52 78 51" {...trazo} strokeWidth={3} />
              <path d="M150 66 C176 20 220 16 248 36 C228 74 182 86 150 66 Z" fill={COLOR.hoja} {...contorno} />
              <path d="M150 66 C180 54 210 44 234 38" {...trazo} strokeWidth={3} />
            </g>
            <path
              d="M150 90 C215 90 240 150 236 200 C232 256 195 282 150 282 C105 282 68 256 64 200 C60 150 85 90 150 90 Z"
              fill={COLOR.cuerpo}
              stroke={COLOR.borde}
              strokeWidth={6}
            />
            <ellipse cx={150} cy={242} rx={56} ry={34} fill={COLOR.barriga} />
            <g transform={`translate(${a.mirada} 0)`}>
              <ellipse cx={98} cy={192} rx={13} ry={8} fill={COLOR.hoja} />
              <ellipse cx={202} cy={192} rx={13} ry={8} fill={COLOR.hoja} />
              <Ojo cx={122} abierto={abierto} />
              <Ojo cx={178} abierto={abierto} />
              <path d={BOCAS[boca]} fill={COLOR.borde} />
              {boca === 'abierta' ? <path d={LENGUA} fill={COLOR.hoja} /> : null}
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};
