// PRUEBA DESECHABLE (spike): Hespo 2D con estirar/aplastar, brazos de goma, hojas con inercia,
// pies que pisan sin patinar, mirada con sacadas y boca que sigue la forma de la voz.
import React, { useId } from 'react';
import { COLOR } from '../tema';
import type { FormaBoca } from './boca';
import { PASO_MEDIO } from './coreografia';
import type { EstadoSim } from './simulacion';

const trazo = { fill: 'none', stroke: COLOR.borde, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const SUELA = 323;
const BASE_CUERPO = 282;
const LARGO_BRAZO = 76;

/** Cuánto está cerrado el ojo (0 abierto, 1 cerrado): parpadeo con cierre rápido y apertura lenta. */
function cierre(frame: number): number {
  const k = (frame + 23) % 96;
  const normal = k < 5 ? [0.45, 0.9, 1, 0.65, 0.25][k] : 0;
  const trasAterrizar = frame >= 23 && frame < 28 ? [0.5, 1, 1, 0.6, 0.2][frame - 23] : 0;
  return Math.max(normal, trasAterrizar);
}

const Brazo: React.FC<{ lado: 1 | -1; grados: number; mano: 'abierta' | 'pulgar' }> = ({ lado, grados, mano }) => {
  const hombro = { x: 150 + 84 * lado, y: 206 };
  const rad = (grados * Math.PI) / 180;
  const d = { x: lado * Math.sin(rad), y: Math.cos(rad) };
  const fin = { x: hombro.x + LARGO_BRAZO * d.x, y: hombro.y + LARGO_BRAZO * d.y };
  // Brazo de goma: se curva hacia afuera como un fideo.
  const n = { x: lado * d.y, y: -lado * d.x };
  const ctrl = { x: (hombro.x + fin.x) / 2 + n.x * 10, y: (hombro.y + fin.y) / 2 + n.y * 10 };
  const ruta = `M${hombro.x} ${hombro.y} Q${ctrl.x} ${ctrl.y} ${fin.x} ${fin.y}`;
  return (
    <g>
      <path d={ruta} {...trazo} strokeWidth={20} />
      <path d={ruta} {...trazo} stroke={COLOR.cuerpo} strokeWidth={10} />
      {mano === 'pulgar' && lado === 1 ? (
        <rect x={fin.x - 10} y={fin.y - 48} width={20} height={44} rx={10} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={6} />
      ) : null}
      <circle cx={fin.x} cy={fin.y} r={16} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={6} />
    </g>
  );
};

/** Pie: en apoyo queda fijo en el suelo mientras el cuerpo avanza; en vuelo sube en arco. */
function pie(fase: number, desfase: number, w: number, escala: number) {
  const medio = PASO_MEDIO / escala;
  const p = (((fase + desfase) % 1) + 1) % 1;
  if (p < 0.5) return { dx: w * medio * (1 - 4 * p), alza: 0 };
  const q = (p - 0.5) / 0.5;
  const suave = 0.5 - 0.5 * Math.cos(Math.PI * q);
  return { dx: w * (-medio + 2 * medio * suave), alza: w * 12 * Math.sin(Math.PI * q) };
}

const Pierna: React.FC<{ lado: 1 | -1; baja: number; dx: number; alza: number; abre: number }> = ({ lado, baja, dx, alza, abre }) => {
  const cadera = { x: 150 + 32 * lado, y: 268 + baja };
  const tobillo = { x: 150 + 36 * lado + dx, y: 306 - alza };
  // Agachado, la rodilla se abre hacia afuera.
  const ctrl = { x: (cadera.x + tobillo.x) / 2 + lado * abre, y: (cadera.y + tobillo.y) / 2 };
  return (
    <g>
      <path d={`M${cadera.x} ${cadera.y} Q${ctrl.x} ${ctrl.y} ${tobillo.x} ${tobillo.y}`} {...trazo} strokeWidth={13} />
      <ellipse cx={tobillo.x + 8 * lado} cy={tobillo.y + 7} rx={25} ry={11} fill={COLOR.borde} transform={`rotate(${-alza * 0.8 * lado} ${tobillo.x} ${tobillo.y + 7})`} />
    </g>
  );
};

const Ojo: React.FC<{ cx: number; cerrado: number; feliz: boolean; mx: number; my: number; estira: number }> = ({ cx, cerrado, feliz, mx, my, estira }) => {
  const cy = 166;
  if (feliz) return <path d={`M${cx - 13} ${cy + 5} Q${cx} ${cy - 12} ${cx + 13} ${cy + 5}`} {...trazo} strokeWidth={7} />;
  const ry = Math.max(2.5, 17 * (1 - cerrado) * (1 + estira * 0.6));
  return (
    <g>
      <ellipse cx={cx + mx * 4} cy={cy + my * 4} rx={13} ry={ry} fill={COLOR.negro} />
      {ry > 8 ? <circle cx={cx + 5 + mx * 5} cy={cy - 7 + my * 4} r={5} fill={COLOR.blanco} /> : null}
    </g>
  );
};

const Boca: React.FC<{ forma: FormaBoca; feliz: boolean }> = ({ forma, feliz }) => {
  const id = useId();
  const cx = 150;
  const cy = 200;
  if (forma.abre === 0) {
    return feliz ? (
      <path d={`M128 196 Q150 228 172 196 Q150 206 128 196 Z`} fill={COLOR.borde} />
    ) : (
      <path d="M131 197 Q150 215 169 197" {...trazo} strokeWidth={6} />
    );
  }
  const rx = 14 + 12 * forma.ancho + 4 * forma.abre;
  const ry = 4 + 20 * forma.abre * (1 - 0.35 * forma.ancho);
  // Forma de «D» invertida: borde de arriba casi recto, abajo redondo.
  const ruta = `M${cx - rx} ${cy - 2} Q${cx} ${cy - 2 - ry * 0.25} ${cx + rx} ${cy - 2} Q${cx + rx * 0.95} ${cy + ry * 1.7} ${cx} ${cy + ry * 1.7} Q${cx - rx * 0.95} ${cy + ry * 1.7} ${cx - rx} ${cy - 2} Z`;
  return (
    <g>
      <clipPath id={id}>
        <path d={ruta} />
      </clipPath>
      <path d={ruta} fill={COLOR.borde} />
      <g clipPath={`url(#${id})`}>
        {forma.abre > 0.35 ? <ellipse cx={cx} cy={cy + ry * 1.7} rx={rx * 0.6} ry={ry * 0.6} fill={COLOR.hoja} /> : null}
        {forma.ancho > 0.6 && forma.abre > 0.25 ? <rect x={cx - rx} y={cy - 8} width={rx * 2} height={9} rx={3} fill={COLOR.blanco} /> : null}
      </g>
    </g>
  );
};

export const Hespo2D: React.FC<{ s: EstadoSim; frame: number; boca: FormaBoca; x: number; sueloY: number; escala: number }> = ({
  s,
  frame,
  boca,
  x,
  sueloY,
  escala,
}) => {
  const sy = 1 + s.deforma;
  const sx = 1 / Math.sqrt(sy);
  const baja = s.agachado * 18;
  const feliz = s.ojos === 'felices';
  const pieI = pie(s.fase, 0, s.w, escala);
  const pieD = pie(s.fase, 0.5, s.w, escala);
  const sombra = 1 / (1 + s.h / 220);

  return (
    <svg
      viewBox="-60 -80 420 420"
      width={420 * escala}
      height={420 * escala}
      style={{ position: 'absolute', left: x - 210 * escala, top: sueloY - (SUELA + 80) * escala, overflow: 'visible' }}
    >
      <ellipse cx={150} cy={SUELA - 2} rx={80 * sombra * sx} ry={11 * sombra} fill={COLOR.negro} opacity={0.2 * sombra} />
      <g transform={`translate(0 ${-s.h / escala})`}>
        <Pierna lado={-1} baja={baja} dx={pieI.dx} alza={pieI.alza} abre={s.agachado * 14} />
        <Pierna lado={1} baja={baja} dx={pieD.dx} alza={pieD.alza} abre={s.agachado * 14} />
        <g transform={`translate(150 ${BASE_CUERPO + baja}) rotate(${s.inclina}) scale(${sx} ${sy}) translate(-150 ${-BASE_CUERPO})`}>
          {/* Tallo que se dobla con las hojas; cada hoja con su propio retraso. */}
          <g transform={`rotate(${(s.hojaD - s.hojaI) * 0.25} 150 98)`}>
            <path d="M150 98 C150 86 151 76 150 66" {...trazo} strokeWidth={9} />
            <g transform={`rotate(${-s.hojaI} 150 66)`}>
              <path d="M150 66 C120 30 84 30 62 50 C84 78 124 84 150 66 Z" fill={COLOR.hoja} stroke={COLOR.borde} strokeWidth={6} strokeLinejoin="round" />
              <path d="M150 66 C125 58 100 52 78 51" {...trazo} strokeWidth={3} />
            </g>
            <g transform={`rotate(${s.hojaD} 150 66)`}>
              <path d="M150 66 C176 20 220 16 248 36 C228 74 182 86 150 66 Z" fill={COLOR.hoja} stroke={COLOR.borde} strokeWidth={6} strokeLinejoin="round" />
              <path d="M150 66 C180 54 210 44 234 38" {...trazo} strokeWidth={3} />
            </g>
          </g>
          <path
            d="M150 90 C215 90 240 150 236 200 C232 256 195 282 150 282 C105 282 68 256 64 200 C60 150 85 90 150 90 Z"
            fill={COLOR.cuerpo}
            stroke={COLOR.borde}
            strokeWidth={6}
          />
          {/* Brillo: da volumen sin salir del estilo plano. */}
          <ellipse cx={118} cy={128} rx={22} ry={12} fill={COLOR.blanco} opacity={0.35} transform="rotate(-30 118 128)" />
          <ellipse cx={150} cy={242} rx={56} ry={34} fill={COLOR.barriga} />
          {/* Brazos de goma por delante: el saludo y los brazos en alto siempre se ven. */}
          <Brazo lado={-1} grados={s.brazoI} mano="abierta" />
          <Brazo lado={1} grados={s.brazoD} mano={s.mano} />
          {/* La cara gira hacia donde mira: sugiere volumen. */}
          <g transform={`translate(${s.miradaX * 12} ${s.miradaY * 7})`}>
            <ellipse cx={98} cy={194} rx={13 * sx} ry={8} fill={COLOR.hoja} />
            <ellipse cx={202} cy={194} rx={13 * sx} ry={8} fill={COLOR.hoja} />
            <Ojo cx={122} cerrado={cierre(frame)} feliz={feliz} mx={s.miradaX} my={s.miradaY} estira={s.deforma} />
            <Ojo cx={178} cerrado={cierre(frame)} feliz={feliz} mx={s.miradaX} my={s.miradaY} estira={s.deforma} />
            <Boca forma={boca} feliz={feliz} />
          </g>
        </g>
      </g>
    </svg>
  );
};
