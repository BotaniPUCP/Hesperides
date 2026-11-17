import type { Pose } from '../guion';

export type Articulaciones = {
  brazoI: number;
  brazoD: number;
  piernaI: number;
  piernaD: number;
  inclina: number;
  saltoY: number;
  /** Cuánto se desplaza la cara hacia donde mira. */
  mirada: number;
};

const REPOSO: Articulaciones = { brazoI: 0, brazoD: 0, piernaI: 0, piernaD: 0, inclina: 0, saltoY: 0, mirada: 0 };

export const POSES_HESPO: Record<Pose, Articulaciones> = {
  quieto: REPOSO,
  saluda: { ...REPOSO, brazoD: -100 },
  senala: { ...REPOSO, brazoI: 10, brazoD: -100, inclina: 3, mirada: 10 },
  presenta: { ...REPOSO, brazoI: 40, brazoD: -40 },
  pulgar: { ...REPOSO, brazoD: -62, mirada: 6 },
  sorpresa: { ...REPOSO, brazoI: 60, brazoD: -60, saltoY: -8 },
  asiente: { ...REPOSO, inclina: 2 },
  salta: { ...REPOSO, brazoI: 118, brazoD: -118, piernaI: 14, piernaD: -14, saltoY: -30 },
  /** Se rasca la cabeza: el brazo derecho sube por encima. */
  confundido: { ...REPOSO, brazoD: -150, inclina: 8, mirada: -6 },
};

export function mezclar(a: Articulaciones, b: Articulaciones, t: number): Articulaciones {
  const entre = (clave: keyof Articulaciones) => a[clave] + (b[clave] - a[clave]) * t;
  return {
    brazoI: entre('brazoI'),
    brazoD: entre('brazoD'),
    piernaI: entre('piernaI'),
    piernaD: entre('piernaD'),
    inclina: entre('inclina'),
    saltoY: entre('saltoY'),
    mirada: entre('mirada'),
  };
}
