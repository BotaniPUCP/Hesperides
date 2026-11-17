// Secuencias de capturas del mapa 3D (giros y alejamientos grabados cuadro a cuadro).

export type Posicion = { a: number; b: number; mezcla: number };
export type CajaGlobo = { x: number; y: number; ancho: number; alto: number };

const ANCHO_CAPTURA = 1920;
const ALTO_CAPTURA = 941;

/**
 * Qué capturas se ven en un cuadro: `a` y `b` vecinas y cuánto de `b` se mezcla. `ritmo` son
 * capturas por cuadro de video (negativo, hacia atrás); `inicial`, la captura del primer cuadro.
 */
export function posicionEnSecuencia(frame: number, desde: number, total: number, ritmo = 1, inicial = 0): Posicion {
  const p = Math.min(total - 1, Math.max(0, inicial + Math.max(0, frame - desde) * ritmo));
  const a = Math.floor(p + 1e-9);
  const b = Math.min(total - 1, a + 1);
  const mezcla = Math.round((p - a) * 1e6) / 1e6;
  return { a, b, mezcla: b === a ? 0 : mezcla };
}

export const rutaCuadro = (carpeta: string, i: number): string => `capturas/que-es/${carpeta}/${String(i).padStart(3, '0')}.jpg`;

const enCuadro = (c: CajaGlobo) => c.x + c.ancho > 0 && c.y + c.alto > 0 && c.x < ANCHO_CAPTURA && c.y < ALTO_CAPTURA;

/** Centro del primer globo visible, en píxeles de la captura, interpolado entre `a` y `b`. */
export function centroDeGlobo(cajas: CajaGlobo[][], pos: Posicion): { x: number; y: number } | null {
  const ca = cajas[pos.a]?.find(enCuadro);
  if (!ca) return null;
  const cb = cajas[pos.b]?.find(enCuadro) ?? ca;
  const m = pos.mezcla;
  return {
    x: ca.x + ca.ancho / 2 + (cb.x + cb.ancho / 2 - (ca.x + ca.ancho / 2)) * m,
    y: ca.y + ca.alto / 2 + (cb.y + cb.alto / 2 - (ca.y + ca.alto / 2)) * m,
  };
}
