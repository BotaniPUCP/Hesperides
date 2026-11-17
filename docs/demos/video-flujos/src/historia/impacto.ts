// «Jugo» en los golpes de la historia (receta de Six Finger Punch Tennis llevada a cuadros):
// sacudida amortiguada, pausa de impacto, cuadro blanco, partículas y separación cromática.
// Todo es función del cuadro y de una semilla: determinista.
import { random } from 'remotion';
import { ESPERA_BROTE } from '../hespo2d/semillaEnGuion';
import type { Linea, TramoEscena } from '../tiempos';
import { momentoDe } from '../ui/anim';
import { corrimientoManana, fraccionesH10, pinEnVideo, SELLO, SUELO, X_ARBOL, X_ARBOL_MANANA, X_BROTE } from './posiciones';

export type Sacudida = { x: number; y: number; giro: number };

/** Sacudida amortiguada amp·e^(−k·t)·sin(ω·t + φ), con φ sacada de la semilla. `t` en cuadros. */
export function sacudida(t: number, { amp, k, semilla }: { amp: number; k: number; semilla: string }): Sacudida {
  if (t < 0) return { x: 0, y: 0, giro: 0 };
  const env = amp * Math.exp(-k * t);
  const fase = (eje: string) => random(`${semilla}-${eje}`) * Math.PI * 2;
  return {
    x: env * Math.sin(1.9 * t + fase('x')),
    y: env * 0.7 * Math.sin(2.3 * t + fase('y')),
    giro: env * 0.04 * Math.sin(1.6 * t + fase('g')),
  };
}

export type Pausa = { frame: number; cuadros: number };

/**
 * Pausa de impacto (hit-stop): la animación local queda congelada en el cuadro del golpe durante
 * `cuadros` cuadros y luego retoma el reloj real, así la imagen no se desfasa de la voz.
 */
export function cuadroConPausa(frame: number, pausas: Pausa[]): number {
  for (const p of pausas) if (frame >= p.frame && frame <= p.frame + p.cuadros) return p.frame;
  return frame;
}

/** Cuadro de impacto blanco: pleno en el golpe, medio al siguiente, nada después. */
export function destelloDeImpacto(t: number): number {
  return t === 0 ? 1 : t === 1 ? 0.45 : 0;
}

/** Separación cromática (px) que decae a cero en `duracion` cuadros. */
export function separacionCromatica(t: number, maximo: number, duracion = 8): number {
  if (t < 0 || t >= duracion) return 0;
  return maximo * (1 - t / duracion) ** 2;
}

export type Particula = { x: number; y: number; r: number; opacidad: number; i: number };

/**
 * Entre 8 y 14 partículas que saltan desde `origen` en abanico (hacia arriba, o hacia abajo con
 * `hacia: 1`) y caen con gravedad.
 */
export function particulas(
  semilla: string,
  t: number,
  origen: { x: number; y: number },
  { vida = 22, gravedad = 1.4, velocidad = [9, 20], abanico = 0.9, hacia = -1 }: { vida?: number; gravedad?: number; velocidad?: [number, number]; abanico?: number; hacia?: 1 | -1 } = {},
): Particula[] {
  if (t < 0 || t >= vida) return [];
  const n = 8 + Math.floor(random(`${semilla}-n`) * 7);
  return Array.from({ length: n }, (_, i) => {
    const ang = hacia * Math.PI * (0.5 + (random(`${semilla}-a${i}`) - 0.5) * abanico);
    const v = velocidad[0] + (velocidad[1] - velocidad[0]) * random(`${semilla}-v${i}`);
    return {
      i,
      x: origen.x + Math.cos(ang) * v * t,
      y: origen.y + Math.sin(ang) * v * t + 0.5 * gravedad * t * t,
      r: 4 + random(`${semilla}-r${i}`) * 6,
      opacidad: 1 - t / vida,
    };
  });
}

export type Golpe = {
  id: 'grieta' | 'brote' | 'mapa' | 'caida' | 'sello';
  frame: number;
  x: number;
  y: number;
  /** Amplitud de la sacudida en px. */
  amp: number;
  pausa: number;
  /** Opacidad máxima del cuadro blanco (0 = sin cuadro blanco). */
  blanco: number;
  /** Separación cromática máxima en px. */
  cromatica: number;
  /** Colores de las partículas (claves de COLOR). */
  colores: ('borde' | 'hoja' | 'arena' | 'blanco' | 'verde' | 'cuerpo')[];
  /** Hacia dónde salen las partículas: −1 arriba (por defecto), 1 abajo. */
  hacia?: 1 | -1;
};

function escena(linea: Linea, id: string): TramoEscena {
  const e = linea.escenas.find((x) => x.id === id);
  if (!e) throw new Error(`Falta la escena ${id}`);
  return e;
}

/** Los cinco golpes de la historia, con su cuadro y su lugar en pantalla. */
export function golpesDeHistoria(linea: Linea): Golpe[] {
  const manana = escena(linea, 'manana');
  const aparece = escena(linea, 'aparece');
  const solucion = escena(linea, 'solucion');
  const grieta = momentoDe(manana, 'h2', 0.4);
  const sello = momentoDe(solucion, 'h10', fraccionesH10.sello) + SELLO.caida;
  const pin = pinEnVideo();
  return [
    { id: 'grieta', frame: grieta, x: X_ARBOL_MANANA - corrimientoManana(manana, grieta) - 70, y: SUELO - 360, amp: 9, pausa: 1, blanco: 0, cromatica: 5, colores: ['borde', 'arena'] },
    { id: 'brote', frame: aparece.desde + ESPERA_BROTE + 3, x: X_BROTE, y: SUELO, amp: 12, pausa: 2, blanco: 0.35, cromatica: 6, colores: ['hoja', 'cuerpo', 'arena'] },
    { id: 'mapa', frame: momentoDe(solucion, 'h9', 0.2), x: pin.x, y: pin.y, amp: 0, pausa: 1, blanco: 0.25, cromatica: 7, colores: ['hoja', 'blanco'] },
    { id: 'caida', frame: momentoDe(solucion, 'h10', fraccionesH10.cae), x: X_ARBOL - 340, y: SUELO - 10, amp: 22, pausa: 2, blanco: 0, cromatica: 6, colores: ['borde', 'hoja', 'cuerpo'] },
    { id: 'sello', frame: sello, x: SELLO.x, y: SELLO.y + 60, hacia: 1, amp: 14, pausa: 2, blanco: 0.6, cromatica: 5, colores: ['verde', 'hoja', 'arena'] },
  ];
}

export type EfectoGolpes = Sacudida & { cromatica: number; blanco: number };

/** Suma de todos los golpes en un cuadro: sacudida, separación cromática y cuadro blanco. */
export function efectoDeGolpes(golpes: Golpe[], frame: number): EfectoGolpes {
  const r: EfectoGolpes = { x: 0, y: 0, giro: 0, cromatica: 0, blanco: 0 };
  for (const g of golpes) {
    const t = frame - g.frame;
    if (t < 0 || t > 40) continue;
    const s = sacudida(t, { amp: g.amp, k: 0.22, semilla: g.id });
    r.x += s.x;
    r.y += s.y;
    r.giro += s.giro;
    r.cromatica = Math.max(r.cromatica, separacionCromatica(t, g.cromatica));
    r.blanco = Math.max(r.blanco, destelloDeImpacto(t) * g.blanco);
  }
  return r;
}

export const pausasDe = (golpes: Golpe[]): Pausa[] => golpes.map((g) => ({ frame: g.frame, cuadros: g.pausa }));
