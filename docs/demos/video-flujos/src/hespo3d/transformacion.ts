import type { EstadoHespo } from '../hespo/recorrido';

/** Altura del Hespo 2D a escala 1, de los pies a la punta de la hoja, en píxeles. */
const ALTO_2D_PX = 0.8 * 380;
/** Altura del modelo 3D, de la suela a la punta de la hoja, en unidades. */
export const ALTO_MODELO = 2.9;

export type Transformacion3D = {
  /** Píxeles de la cámara ortográfica: x a la derecha, y hacia arriba (por eso negativa). */
  x: number;
  y: number;
  giroY: number;
  /** Píxeles por unidad del modelo. */
  escalaPx: number;
  /** Radianes; positivo = el brazo sube. */
  brazoI: number;
  brazoD: number;
  piernaI: number;
  piernaD: number;
  /** Radianes; positivo = se inclina hacia donde mira. */
  inclina: number;
  /** Cuánto gira la cabeza hacia donde mira, en radianes. */
  mirada: number;
};

const rad = (grados: number) => (grados * Math.PI) / 180;

/** Lleva el estado del Hespo 2D al Hespo 3D: mismo lugar, mismo tamaño, misma pose. */
export function transformacion3D(estado: EstadoHespo, escala: number): Transformacion3D {
  const a = estado.articulaciones;
  return {
    x: estado.x,
    y: -(estado.y + a.saltoY),
    giroY: estado.mira === 1 ? 0 : Math.PI,
    escalaPx: (ALTO_2D_PX / ALTO_MODELO) * escala,
    brazoI: rad(a.brazoI),
    brazoD: -rad(a.brazoD),
    piernaI: rad(a.piernaI),
    piernaD: rad(a.piernaD),
    inclina: rad(a.inclina),
    mirada: rad(a.mirada * 2),
  };
}
