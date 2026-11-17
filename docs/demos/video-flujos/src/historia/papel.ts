// Fondos de papel recortado (idea de anabology): cada fondo se parte en hojas con borde ondulado y
// una sombra suave común. Las hojas quietas se pre-renderizan a PNG (npm run fondos) y se mueven
// con paralaje según la cámara: la textura del corte queda pegada a la hoja, nunca a la pantalla.
import type { Toma } from './camara';

/** Sube este número cada vez que cambie el dibujo de una hoja: obliga a regenerar los PNG. */
export const VERSION_FONDOS = 1;
/** Margen alrededor del cuadro de 1920×940 que tiene cada hoja, para el paneo y el paralaje. */
export const MARGEN_HOJA = 300;
export const ANCHO_HOJA = 1920 + 2 * MARGEN_HOJA;
export const ALTO_HOJA = 940 + 2 * MARGEN_HOJA;

export type IdHoja = 'colinas-lejos' | 'colinas-cerca' | 'edificios' | 'suelo' | 'matas' | 'pared' | 'ventana' | 'cuadro' | 'piso' | 'maceta';
export type Hoja = { id: IdHoja; fondo: 'campus' | 'oficina'; factor: number; opacidad?: number };

/** Hojas de cada fondo, de atrás hacia adelante. El factor es cuánto sigue a la cámara. */
export const HOJAS: Hoja[] = [
  { id: 'colinas-lejos', fondo: 'campus', factor: 0.2, opacidad: 0.5 },
  { id: 'colinas-cerca', fondo: 'campus', factor: 0.35 },
  { id: 'edificios', fondo: 'campus', factor: 0.5 },
  { id: 'suelo', fondo: 'campus', factor: 1 },
  { id: 'matas', fondo: 'campus', factor: 1.4 },
  { id: 'pared', fondo: 'oficina', factor: 0.5 },
  { id: 'ventana', fondo: 'oficina', factor: 0.7 },
  { id: 'cuadro', fondo: 'oficina', factor: 0.7 },
  { id: 'piso', fondo: 'oficina', factor: 1 },
  { id: 'maceta', fondo: 'oficina', factor: 1.4 },
];

export const hoja = (id: IdHoja): Hoja => {
  const h = HOJAS.find((x) => x.id === id);
  if (!h) throw new Error(`No existe la hoja ${id}`);
  return h;
};

export const rutaHoja = (id: IdHoja): string => `fondos/v${VERSION_FONDOS}/${id}.png`;
export const rutaManifiestoFondos = (): string => `fondos/v${VERSION_FONDOS}/manifiesto.json`;

const CENTRO = { x: 960, y: 470 };

/**
 * Desplazamiento de una hoja en coordenadas de escena. La cámara mueve toda la escena; la hoja
 * se corre `(1 − factor)` de ese movimiento para que en pantalla avance `factor` veces lo que
 * avanza la cámara. El paneo del decorado (`corrimiento`) también se multiplica por el factor.
 */
export function paralaje(toma: Pick<Toma, 'x' | 'y'>, factor: number, corrimiento = 0): { x: number; y: number } {
  return {
    x: -corrimiento * factor + (toma.x - CENTRO.x) * (1 - factor),
    y: (toma.y - CENTRO.y) * (1 - factor),
  };
}
