// PRUEBA DESECHABLE (spike): Hespo rediseñado con técnicas de animación 2D avanzadas.
import React, { useId } from 'react';
import { random } from 'remotion';
import { COLOR } from '../../tema';
import type { FormaBoca } from '../boca';
import { ATERRIZAJES, PASO_MEDIO, type Emocion } from '../coreografia';
import type { EstadoSim } from '../simulacion';
import type { Diseno } from './disenos';
import { contorno, curvaCerrada, hoja } from './geometria';

const CX = 150;
const SUELA = 323;
/** Escala con la que se pensó la coreografía: los pasos se miden en ella. */
const ESCALA_REFERENCIA = 1.15;
const rad = (g: number) => (g * Math.PI) / 180;

function cierreDeOjos(frame: number): number {
  const k = (frame + 23) % 96;
  const normal = k < 5 ? [0.45, 0.9, 1, 0.65, 0.25][k] : 0;
  const trasAterrizar = frame >= 23 && frame < 28 ? [0.5, 1, 1, 0.6, 0.2][frame - 23] : 0;
  return Math.max(normal, trasAterrizar);
}

function pie(fase: number, desfase: number, w: number) {
  const medio = PASO_MEDIO / ESCALA_REFERENCIA;
  const p = (((fase + desfase) % 1) + 1) % 1;
  if (p < 0.5) return { dx: w * medio * (1 - 4 * p), alza: 0 };
  const q = (p - 0.5) / 0.5;
  return { dx: w * (-medio + 2 * medio * (0.5 - 0.5 * Math.cos(Math.PI * q))), alza: w * 12 * Math.sin(Math.PI * q) };
}

// ---------- Hojas ----------
type DefHoja = { ang: number; largo: number; ancho: number; lado: -1 | 0 | 1; curva: number };
const HOJAS: Record<Diseno['hojas'], DefHoja[]> = {
  // La hoja derecha (de quien mira) es la más grande: regla de marca.
  dos: [
    { ang: -150, largo: 80, ancho: 26, lado: -1, curva: 0.25 },
    { ang: -32, largo: 96, ancho: 31, lado: 1, curva: -0.25 },
  ],
  tres: [
    { ang: -155, largo: 62, ancho: 20, lado: -1, curva: 0.3 },
    { ang: -92, largo: 48, ancho: 16, lado: 0, curva: 0 },
    { ang: -27, largo: 74, ancho: 24, lado: 1, curva: -0.3 },
  ],
  rizo: [
    { ang: -150, largo: 44, ancho: 15, lado: -1, curva: 0.3 },
    { ang: -62, largo: 100, ancho: 27, lado: 1, curva: -1.25 },
  ],
  // Brote: dos hojitas en la punta de un tallo largo y curvo.
  brote: [
    { ang: -165, largo: 44, ancho: 15, lado: -1, curva: 0.45 },
    { ang: -18, largo: 58, ancho: 20, lado: 1, curva: -0.4 },
  ],
};
/** Las hojas son orejas: cada emoción las abre, las cierra o las deja caer (grados hacia arriba). */
const OREJAS: Record<Emocion, { sube: number; tiesa: number }> = {
  neutral: { sube: 0, tiesa: 1 },
  feliz: { sube: 16, tiesa: 1 },
  sorpresa: { sube: 26, tiesa: 0.4 },
  pensativo: { sube: -8, tiesa: 1.2 },
  triste: { sube: -48, tiesa: 1.8 },
};

const Hojas: React.FC<{ d: Diseno; s: EstadoSim; tope: number }> = ({ d, s, tope }) => {
  const oreja = OREJAS[s.emocion];
  const flex = (s.hojaD - s.hojaI) * 0.3;
  const brote = d.hojas === 'brote';
  const largoTallo = (brote ? 44 : 22) * d.tamHojas;
  // El tallo del brote se curva hacia un lado y se mece con la física de las hojas.
  const lateral = brote ? 14 + flex * 1.5 : flex;
  const punta = { x: CX + lateral, y: tope - largoTallo };
  const ctrl = { x: CX + (brote ? -8 + flex * 0.5 : 0), y: tope - largoTallo * 0.55 };
  return (
    <g>
      <path d={`M${CX} ${tope + 8} Q${ctrl.x} ${ctrl.y} ${punta.x} ${punta.y}`} fill="none" stroke={COLOR.borde} strokeWidth={brote ? 6 : 8} strokeLinecap="round" />
      {brote ? (
        <path d={`M${CX} ${tope + 8} Q${ctrl.x} ${ctrl.y} ${punta.x} ${punta.y}`} fill="none" stroke={COLOR.hoja} strokeWidth={2.5} strokeLinecap="round" />
      ) : null}
      {HOJAS[d.hojas].map((h, i) => {
        const fisica = h.lado === -1 ? -s.hojaI : h.lado === 1 ? s.hojaD : (s.hojaD - s.hojaI) * 0.5;
        const angulo = h.ang + fisica + (h.lado === 0 ? 0 : -h.lado * oreja.sube);
        const curva = h.curva * oreja.tiesa + rad(fisica) * 0.7;
        const forma = hoja(h.largo * d.tamHojas, h.ancho * d.tamHojas, rad(angulo), curva);
        return (
          <g key={i} transform={`translate(${punta.x} ${punta.y})`}>
            <path d={forma.contorno} fill={COLOR.hoja} stroke={d.contorno ? COLOR.borde : 'none'} strokeWidth={d.contorno} strokeLinejoin="round" />
            <path d={forma.nervio} fill="none" stroke={COLOR.borde} strokeWidth={3} strokeLinecap="round" opacity={d.contorno ? 0.8 : 0.35} />
          </g>
        );
      })}
    </g>
  );
};

// ---------- Brazos (con smear) ----------
const Mano: React.FC<{ d: Diseno; x: number; y: number; angulo: number; pulgar: boolean; opacidad?: number }> = ({ d, x, y, angulo, pulgar, opacidad = 1 }) => {
  const borde = d.contorno ? COLOR.borde : 'none';
  if (d.brazos === 'hojas') {
    const f = hoja(36, 13, angulo, 0.35);
    return (
      <g transform={`translate(${x} ${y})`} opacity={opacidad}>
        <path d={f.contorno} fill={COLOR.hoja} stroke={borde} strokeWidth={d.contorno * 0.8} strokeLinejoin="round" />
      </g>
    );
  }
  if (d.brazos === 'palitos') {
    return (
      <g opacity={opacidad}>
        {pulgar ? <rect x={x - 4.5} y={y - 21} width={9} height={17} rx={4.5} fill={COLOR.borde} /> : null}
        <circle cx={x} cy={y} r={8.5} fill={COLOR.borde} />
      </g>
    );
  }
  if (d.brazos === 'munones') {
    return pulgar ? (
      <rect x={x - 9} y={y - 34} width={18} height={30} rx={9} fill={COLOR.cuerpo} stroke={borde} strokeWidth={d.contorno} opacity={opacidad} />
    ) : null;
  }
  const r = d.brazos === 'flotantes' ? 16 : 11;
  const relleno = d.contorno ? COLOR.cuerpo : COLOR.hoja;
  return (
    <g opacity={opacidad}>
      {pulgar ? <rect x={x - r * 0.6} y={y - r * 2.6} width={r * 1.2} height={r * 2.3} rx={r * 0.6} fill={relleno} stroke={borde} strokeWidth={d.contorno} /> : null}
      <circle cx={x} cy={y} r={r} fill={relleno} stroke={borde} strokeWidth={d.contorno} />
    </g>
  );
};

const Brazo: React.FC<{ d: Diseno; hombro: { x: number; y: number }; lado: 1 | -1; grados: number; vel: number; pulgar: boolean }> = ({
  d,
  hombro,
  lado,
  grados,
  vel,
  pulgar,
}) => {
  const largo = d.brazos === 'munones' ? 30 : d.brazos === 'fideo' ? 58 : d.brazos === 'flotantes' ? 46 : d.brazos === 'palitos' ? 42 : 16;
  const fin = (g: number) => {
    const a = rad(g);
    return { x: hombro.x + lado * Math.sin(a) * largo, y: hombro.y + Math.cos(a) * largo, angulo: Math.atan2(Math.cos(a), lado * Math.sin(a)) };
  };
  const f = fin(grados);
  // Smear: si el brazo va rápido, quedan «múltiples» de la mano detrás del movimiento.
  const fantasmas = Math.abs(vel) > 260 ? [0.35, 0.7].map((k, i) => ({ ...fin(grados - (vel / 30) * k), opacidad: 0.32 - i * 0.14 })) : [];
  const borde = d.contorno ? COLOR.borde : 'none';
  const relleno = d.contorno ? COLOR.cuerpo : COLOR.hoja;

  let brazo: React.ReactNode = null;
  if (d.brazos === 'munones' || d.brazos === 'hojas') {
    const grosor = d.brazos === 'munones' ? 24 : 13;
    brazo = (
      <>
        {d.contorno ? <path d={`M${hombro.x} ${hombro.y} L${f.x} ${f.y}`} stroke={borde} strokeWidth={grosor + d.contorno * 2} strokeLinecap="round" /> : null}
        <path d={`M${hombro.x} ${hombro.y} L${f.x} ${f.y}`} stroke={relleno} strokeWidth={grosor} strokeLinecap="round" />
      </>
    );
  } else if (d.brazos === 'palitos') {
    // Palito con un leve codo: se lee como brazo aun siendo tan fino.
    const codo = { x: (hombro.x + f.x) / 2 + lado * 3, y: (hombro.y + f.y) / 2 + 2 };
    brazo = <path d={`M${hombro.x} ${hombro.y} Q${codo.x} ${codo.y} ${f.x} ${f.y}`} fill="none" stroke={COLOR.borde} strokeWidth={6.5} strokeLinecap="round" />;
  } else if (d.brazos === 'fideo') {
    const n = { x: lado * Math.cos(rad(grados)), y: -lado * lado * Math.sin(rad(grados)) };
    const ctrl = { x: (hombro.x + f.x) / 2 + n.x * 8, y: (hombro.y + f.y) / 2 + n.y * 8 };
    brazo = <path d={`M${hombro.x} ${hombro.y} Q${ctrl.x} ${ctrl.y} ${f.x} ${f.y}`} fill="none" stroke={relleno} strokeWidth={9} strokeLinecap="round" />;
  }
  return (
    <g>
      {fantasmas.map((g, i) => (
        <Mano key={i} d={d} x={g.x} y={g.y} angulo={g.angulo} pulgar={false} opacidad={g.opacidad} />
      ))}
      {brazo}
      <Mano d={d} x={f.x} y={f.y} angulo={f.angulo} pulgar={pulgar} />
    </g>
  );
};

// ---------- Cara ----------
type Parpado = { cubre: number; inclina: number };
const PARPADOS: Record<Emocion, Parpado> = {
  neutral: { cubre: 0, inclina: 0 },
  feliz: { cubre: 0, inclina: 0 },
  sorpresa: { cubre: 0, inclina: 0 },
  pensativo: { cubre: 0.42, inclina: 0 },
  triste: { cubre: 0.32, inclina: 7 },
};

const Ojo: React.FC<{ d: Diseno; x: number; y: number; lado: -1 | 1; s: EstadoSim; cierre: number }> = ({ d, x, y, lado, s, cierre }) => {
  const t = d.ojos.tam * (s.emocion === 'sorpresa' ? (d.ojos.tipo === 'puntos' ? 1.3 : 1.17) : 1);
  const rx = (d.ojos.tipo === 'grandes' ? 16 : d.ojos.tipo === 'puntos' ? 9 : 13) * t;
  const ryBase = (d.ojos.tipo === 'grandes' ? 20 : d.ojos.tipo === 'puntos' ? 9 : 17) * t;
  if (s.emocion === 'feliz') {
    return <path d={`M${x - rx} ${y + 4} Q${x} ${y - ryBase * 0.9} ${x + rx} ${y + 4}`} fill="none" stroke={COLOR.borde} strokeWidth={7} strokeLinecap="round" />;
  }
  const ry = Math.max(2.5, ryBase * (1 - cierre) * (1 + s.deforma * 0.5));
  const mx = s.miradaX * 4;
  const my = s.miradaY * 4;
  const p = PARPADOS[s.emocion];
  const borde = y - ry + 2 * ry * p.cubre;
  return (
    <g>
      <ellipse cx={x + mx} cy={y + my} rx={rx} ry={ry} fill={COLOR.negro} />
      {ry > 7 && d.ojos.tipo === 'grandes' ? (
        <>
          <circle cx={x + mx + rx * 0.35} cy={y + my - ry * 0.4} r={6.5 * t} fill={COLOR.blanco} />
          <circle cx={x + mx - rx * 0.35} cy={y + my + ry * 0.35} r={3 * t} fill={COLOR.blanco} />
        </>
      ) : ry > 7 ? (
        <circle cx={x + mx + rx * 0.35} cy={y + my - ry * 0.4} r={(d.ojos.tipo === 'puntos' ? 2.6 : 5) * t} fill={COLOR.blanco} />
      ) : null}
      {p.cubre > 0 && ry > 3 ? (
        <>
          <path
            d={`M${x - rx - 4} ${y - ry - 6} L${x + rx + 4} ${y - ry - 6} L${x + rx + 4} ${borde + lado * p.inclina} L${x - rx - 4} ${borde - lado * p.inclina} Z`}
            fill={d.relleno ?? COLOR.cuerpo}
          />
          <path d={`M${x - rx - 2} ${borde - lado * p.inclina} L${x + rx + 2} ${borde + lado * p.inclina}`} stroke={COLOR.borde} strokeWidth={4} strokeLinecap="round" />
        </>
      ) : null}
    </g>
  );
};

const Ceja: React.FC<{ x: number; y: number; lado: -1 | 1; emocion: Emocion }> = ({ x, y, lado, emocion }) => {
  const alto = { neutral: 0, feliz: -5, sorpresa: -11, pensativo: lado === 1 ? -9 : 2, triste: -2 }[emocion];
  // Triste: el extremo interior sube. Pensativo: una sola ceja levantada.
  const interior = emocion === 'triste' ? -9 : 0;
  const xi = x - lado * 11;
  const xe = x + lado * 11;
  return <path d={`M${xi} ${y + alto + interior} Q${x} ${y + alto - 5} ${xe} ${y + alto + 2}`} fill="none" stroke={COLOR.borde} strokeWidth={6} strokeLinecap="round" />;
};

const Boca: React.FC<{ x: number; y: number; forma: FormaBoca; emocion: Emocion }> = ({ x, y, forma, emocion }) => {
  const id = useId();
  if (forma.abre > 0) {
    const rx = 13 + 11 * forma.ancho + 4 * forma.abre;
    const ry = 4 + 19 * forma.abre * (1 - 0.35 * forma.ancho);
    const ruta = `M${x - rx} ${y - 2} Q${x} ${y - 2 - ry * 0.25} ${x + rx} ${y - 2} Q${x + rx * 0.95} ${y + ry * 1.7} ${x} ${y + ry * 1.7} Q${x - rx * 0.95} ${y + ry * 1.7} ${x - rx} ${y - 2} Z`;
    return (
      <g>
        <clipPath id={id}>
          <path d={ruta} />
        </clipPath>
        <path d={ruta} fill={COLOR.borde} />
        <g clipPath={`url(#${id})`}>
          {forma.abre > 0.35 ? <ellipse cx={x} cy={y + ry * 1.7} rx={rx * 0.6} ry={ry * 0.6} fill={COLOR.hoja} /> : null}
          {forma.ancho > 0.6 && forma.abre > 0.25 ? <rect x={x - rx} y={y - 8} width={rx * 2} height={9} rx={3} fill={COLOR.blanco} /> : null}
        </g>
      </g>
    );
  }
  const trazo = { fill: 'none', stroke: COLOR.borde, strokeWidth: 6, strokeLinecap: 'round' as const };
  switch (emocion) {
    case 'feliz':
      return (
        <g>
          <path d={`M${x - 20} ${y - 4} Q${x} ${y + 30} ${x + 20} ${y - 4} Q${x} ${y + 4} ${x - 20} ${y - 4} Z`} fill={COLOR.borde} />
          <ellipse cx={x} cy={y + 13} rx={8} ry={4} fill={COLOR.hoja} />
        </g>
      );
    case 'sorpresa':
      return <ellipse cx={x} cy={y + 4} rx={8} ry={10} fill={COLOR.borde} />;
    case 'pensativo':
      return <path d={`M${x - 6} ${y + 2} Q${x + 6} ${y - 1} ${x + 16} ${y + 3}`} {...trazo} />;
    case 'triste':
      return <path d={`M${x - 15} ${y + 8} Q${x} ${y - 6} ${x + 15} ${y + 8}`} {...trazo} />;
    default:
      return <path d={`M${x - 18} ${y - 3} Q${x} ${y + 15} ${x + 18} ${y - 3}`} {...trazo} />;
  }
};

// ---------- Efectos ----------
const Polvo: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    {ATERRIZAJES.flatMap((desde) => {
      const t = frame - desde;
      if (t < 0 || t >= 18) return [];
      return Array.from({ length: 6 }, (_, i) => {
        const lado = i < 3 ? -1 : 1;
        const k = i % 3;
        return (
          <circle
            key={`${desde}-${i}`}
            cx={CX + lado * (62 + t * 3.4 * (1 + k * 0.45))}
            cy={SUELA - 6 - t * 0.9 * (1 + k * 0.3) - k * 7}
            r={7 + t * 1.15 - k * 2}
            fill={COLOR.blanco}
            opacity={(1 - t / 18) * 0.75}
          />
        );
      });
    })}
  </g>
);

const LineasDeVelocidad: React.FC<{ vh: number; base: number }> = ({ vh, base }) => {
  if (Math.abs(vh) < 300) return null;
  const largo = Math.min(90, Math.abs(vh) * 0.06);
  // Quedan del lado de donde viene: debajo al subir, encima al caer.
  const y0 = vh > 0 ? base + 18 : base - 260;
  const sentido = vh > 0 ? 1 : -1;
  return (
    <g opacity={0.7}>
      {[-46, 0, 46].map((dx, i) => (
        <line key={i} x1={CX + dx} y1={y0 + i * 8} x2={CX + dx} y2={y0 + i * 8 + sentido * largo} stroke={COLOR.blanco} strokeWidth={5} strokeLinecap="round" />
      ))}
    </g>
  );
};

const Destellos: React.FC<{ frame: number; tope: number }> = ({ frame, tope }) => (
  <g>
    {[
      { x: CX - 120, y: tope + 10 },
      { x: CX + 128, y: tope + 40 },
      { x: CX + 96, y: tope - 60 },
    ].map((p, i) => {
      const e = Math.max(0, Math.sin(frame / 4 + i * 2.1));
      const r = 15 * e;
      return (
        <path
          key={i}
          d={`M${p.x} ${p.y - r} Q${p.x} ${p.y} ${p.x + r} ${p.y} Q${p.x} ${p.y} ${p.x} ${p.y + r} Q${p.x} ${p.y} ${p.x - r} ${p.y} Q${p.x} ${p.y} ${p.x} ${p.y - r} Z`}
          fill={COLOR.blanco}
          opacity={0.9 * e}
        />
      );
    })}
  </g>
);

// ---------- Cáscara: gorro, pecas y migas ----------
/** Parte de arriba de otro color: gorro de bellota (curva) o cáscara que se rompe (zigzag). */
const Gorro: React.FC<{ d: Diseno; cy: number }> = ({ d, cy }) => {
  if (!d.gorro) return null;
  const y = cy - d.cuerpo.alto + 2 * d.cuerpo.alto * d.gorro.altura;
  let borde: string;
  if (d.gorro.borde === 'curva') {
    borde = `M${CX + 160} ${y} Q${CX} ${y + 26} ${CX - 160} ${y}`;
  } else {
    const xs = Array.from({ length: 19 }, (_, i) => CX + 162 - i * 18);
    borde = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x} ${y + (i % 2 ? 11 : -7)}`).join(' ');
  }
  return (
    <g>
      <path d={`${borde} L${CX - 160} ${y - 260} L${CX + 160} ${y - 260} Z`} fill={d.gorro.color} />
      <path d={borde} fill="none" stroke={COLOR.borde} strokeWidth={3.5} strokeLinejoin="round" />
    </g>
  );
};

/** Pecas fijas en la parte de arriba de la cáscara, lejos de la cara. */
function pecasDe(d: Diseno, cy: number) {
  const { ancho, alto } = d.cuerpo;
  const limite = cy + d.ojos.y - 34;
  const pecas: { x: number; y: number; r: number }[] = [];
  for (let i = 0; pecas.length < (d.pecas ?? 0) && i < 200; i++) {
    const x = CX + (random(`px${d.id}${i}`) - 0.5) * 2 * ancho * 0.8;
    const y = cy - alto + random(`py${d.id}${i}`) * (limite - (cy - alto));
    const dentro = ((x - CX) / (ancho * 0.85)) ** 2 + ((y - cy) / (alto * 0.88)) ** 2 < 1;
    if (dentro) pecas.push({ x, y, r: 2.2 + random(`pr${d.id}${i}`) * 2.6 });
  }
  return pecas;
}

/** Migas de tierra alrededor de los pies: saltan un poco cada vez que aterriza. */
const Migas: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    {Array.from({ length: 8 }, (_, i) => {
      const lado = i % 2 ? 1 : -1;
      const x = CX + lado * (54 + random(`mx${i}`) * 60);
      const salto = ATERRIZAJES.reduce((acc, desde) => {
        const t = frame - desde;
        return t >= 0 && t < 14 ? acc + Math.sin((Math.PI * t) / 14) * (8 + random(`ms${i}`) * 14) : acc;
      }, 0);
      return <circle key={i} cx={x} cy={SUELA - 3 - random(`my${i}`) * 6 - salto} r={2.2 + random(`mr${i}`) * 2.8} fill={COLOR.borde} opacity={0.75} />;
    })}
  </g>
);

// ---------- Hespo ----------
export const HespoV2: React.FC<{
  d: Diseno;
  s: EstadoSim;
  frame: number;
  boca: FormaBoca;
  x: number;
  sueloY: number;
  escala: number;
  vh: number;
  /** Cada cuántos cuadros cambia el temblor del trazo; 2 si Hespo se anima «en dos». */
  cuadrosPorTrazo?: number;
}> = ({
  d,
  cuadrosPorTrazo = 3,
  s,
  frame,
  boca,
  x,
  sueloY,
  escala,
  vh,
}) => {
  const ids = useId();
  const clip = `${ids}c`;
  const filtro = `${ids}f`;
  const brillo = `${ids}g`;
  const { ancho, alto } = d.cuerpo;
  const cy = d.base - alto;
  const sy = 1 + s.deforma;
  const sx = 1 / Math.sqrt(sy);
  const baja = s.agachado * 16;
  const puntos = contorno(d.cuerpo, s.temblor);
  const cuerpo = curvaCerrada(puntos.map((p) => ({ x: p.x + CX, y: p.y + cy })));
  const corrimiento = { x: -ancho * 0.14 - s.miradaX * 6, y: -alto * 0.1 };
  const sombraCel = curvaCerrada(puntos.map((p) => ({ x: p.x + CX + corrimiento.x, y: p.y + cy + corrimiento.y })));
  const relleno = d.relleno ?? COLOR.cuerpo;
  const pecas = pecasDe(d, cy);
  const tope = cy - alto * (1 - s.temblor * 0.5);
  const pieI = pie(s.fase, 0, s.w);
  const pieD = pie(s.fase, 0.5, s.w);
  const sombra = 1 / (1 + s.h / 220);
  // Giro 2.5D: la cara se corre hacia donde mira y la luz hacia el otro lado.
  const cara = { x: CX + s.miradaX * ancho * 0.16, y: cy + d.ojos.y + s.miradaY * alto * 0.08 };
  const hombroY = cy + alto * 0.2;
  const hombroX = ancho * (d.cuerpo.forma === 'gota' ? 0.9 : 0.97);
  const cierre = cierreDeOjos(frame);

  return (
    <svg
      viewBox="-90 -150 480 480"
      width={480 * escala}
      height={480 * escala}
      style={{ position: 'absolute', left: x - (CX + 90) * escala, top: sueloY - (SUELA + 150) * escala, overflow: 'visible' }}
    >
      <defs>
        <clipPath id={clip}>
          <path d={cuerpo} />
        </clipPath>
        <radialGradient id={brillo} cx="0.35" cy="0.28" r="0.75">
          <stop offset="0" stopColor={COLOR.blanco} stopOpacity={0.38} />
          <stop offset="1" stopColor={COLOR.blanco} stopOpacity={0} />
        </radialGradient>
        {d.trazoAMano ? (
          <filter id={filtro} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={Math.floor(frame / cuadrosPorTrazo)} result="ruido" />
            <feDisplacementMap in="SourceGraphic" in2="ruido" scale={2.5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        ) : null}
      </defs>
      <ellipse cx={CX} cy={SUELA - 2} rx={82 * sombra * sx} ry={11 * sombra} fill={COLOR.negro} opacity={0.2 * sombra} />
      {d.migas ? <Migas frame={frame} /> : null}
      <Polvo frame={frame} />
      <g filter={d.trazoAMano ? `url(#${filtro})` : undefined}>
        <g transform={`translate(0 ${-s.h / escala})`}>
          <LineasDeVelocidad vh={vh} base={d.base} />
          {/* Pies */}
          {([-1, 1] as const).map((lado) => {
            const p = lado === -1 ? pieI : pieD;
            if (d.pies === 'piernas') {
              const cadera = { x: CX + 28 * lado, y: d.base - 14 + baja };
              const tobillo = { x: CX + 32 * lado + p.dx, y: 310 - p.alza };
              return (
                <g key={lado}>
                  <path d={`M${cadera.x} ${cadera.y} Q${(cadera.x + tobillo.x) / 2 + lado * s.agachado * 12} ${(cadera.y + tobillo.y) / 2} ${tobillo.x} ${tobillo.y}`} fill="none" stroke={COLOR.borde} strokeWidth={12} strokeLinecap="round" />
                  <ellipse cx={tobillo.x + 6 * lado} cy={tobillo.y + 6} rx={22} ry={10} fill={COLOR.borde} />
                </g>
              );
            }
            if (d.pies === 'palitos') {
              const cadera = { x: CX + 20 * lado, y: d.base - 8 + baja };
              const tobillo = { x: CX + 22 * lado + p.dx, y: SUELA - 7 - p.alza };
              return (
                <g key={lado}>
                  <path d={`M${cadera.x} ${cadera.y} L${tobillo.x} ${tobillo.y}`} stroke={COLOR.borde} strokeWidth={5} strokeLinecap="round" />
                  <ellipse cx={tobillo.x + 5 * lado} cy={tobillo.y + 2} rx={11} ry={6} fill={COLOR.borde} />
                </g>
              );
            }
            const sep = d.pies === 'botones' ? 30 : 36;
            return <ellipse key={lado} cx={CX + sep * lado + p.dx} cy={SUELA - 11 - p.alza} rx={d.pies === 'botones' ? 23 : 20} ry={11} fill={COLOR.borde} />;
          })}
          <g transform={`translate(${CX} ${d.base + baja}) rotate(${s.inclina}) scale(${sx} ${sy}) translate(${-CX} ${-d.base})`}>
            <Hojas d={d} s={s} tope={tope} />
            <path d={cuerpo} fill={relleno} />
            <g clipPath={`url(#${clip})`}>
              {d.gorro ? <Gorro d={d} cy={cy} /> : null}
              {pecas.map((p, i) => (
                <ellipse key={i} cx={p.x} cy={p.y} rx={p.r} ry={p.r * 0.8} fill={COLOR.borde} opacity={0.32} />
              ))}
              {d.sombreado === 'cel' ? (
                // Sombreado cel: solo la media luna de sombra (cuerpo menos su copia corrida); se corre con la mirada.
                <path d={`${cuerpo} ${sombraCel}`} fillRule="evenodd" fill={COLOR.borde} opacity={0.17} />
              ) : (
                <ellipse cx={CX + ancho * 0.25} cy={cy + alto * 0.85} rx={ancho} ry={alto * 0.4} fill={COLOR.borde} opacity={0.1} />
              )}
              {d.barriga ? <ellipse cx={CX + s.miradaX * 8} cy={cy + alto * 0.62} rx={ancho * 0.64} ry={alto * 0.38} fill={COLOR.barriga} /> : null}
              <path d={cuerpo} fill={`url(#${brillo})`} />
              <ellipse cx={CX - ancho * 0.42 - s.miradaX * 6} cy={cy - alto * 0.5} rx={ancho * 0.22} ry={alto * 0.12} fill={COLOR.blanco} opacity={0.4} transform={`rotate(-32 ${CX - ancho * 0.42} ${cy - alto * 0.5})`} />
            </g>
            {d.contorno ? <path d={cuerpo} fill="none" stroke={COLOR.borde} strokeWidth={d.contorno} strokeLinejoin="round" /> : null}
            {/* Cara */}
            <ellipse cx={cara.x - d.ojos.sep - 16} cy={cara.y + 24} rx={12} ry={7} fill={COLOR.hoja} opacity={0.95} />
            <ellipse cx={cara.x + d.ojos.sep + 16} cy={cara.y + 24} rx={12} ry={7} fill={COLOR.hoja} opacity={0.95} />
            {d.pequitas
              ? ([-1, 1] as const).flatMap((lado) =>
                  [
                    [-5, 0],
                    [4, -2],
                    [0, 5],
                  ].map(([dx, dy], i) => (
                    <circle key={`${lado}${i}`} cx={cara.x + lado * (d.ojos.sep + 16) + dx} cy={cara.y + 24 + dy} r={1.9} fill={COLOR.borde} opacity={0.55} />
                  )),
                )
              : null}
            <Ojo d={d} x={cara.x - d.ojos.sep} y={cara.y} lado={-1} s={s} cierre={cierre} />
            <Ojo d={d} x={cara.x + d.ojos.sep} y={cara.y} lado={1} s={s} cierre={cierre} />
            {d.cejas ? (
              <>
                <Ceja x={cara.x - d.ojos.sep} y={cara.y - 22 * d.ojos.tam - 12} lado={-1} emocion={s.emocion} />
                <Ceja x={cara.x + d.ojos.sep} y={cara.y - 22 * d.ojos.tam - 12} lado={1} emocion={s.emocion} />
              </>
            ) : null}
            <Boca x={cara.x} y={cara.y + 30 * d.ojos.tam} forma={boca} emocion={s.emocion} />
            <Brazo d={d} hombro={{ x: CX - hombroX, y: hombroY }} lado={-1} grados={s.brazoI} vel={0} pulgar={false} />
            <Brazo d={d} hombro={{ x: CX + hombroX, y: hombroY }} lado={1} grados={s.brazoD} vel={s.velBrazoD} pulgar={s.mano === 'pulgar'} />
          </g>
        </g>
      </g>
      {s.emocion === 'feliz' ? <Destellos frame={frame} tope={tope - s.h / escala - 40} /> : null}
    </svg>
  );
};
