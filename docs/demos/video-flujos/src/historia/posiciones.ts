// Tiempos y lugares de la historia que comparten las escenas, los golpes y la cámara.
import { Easing, interpolate } from 'remotion';
import type { TramoEscena } from '../tiempos';
import { momentoDe } from '../ui/anim';

export const HORIZONTE = 640;
export const SUELO = 880;

const suave = Easing.inOut(Easing.cubic);
/** Valor que pasa por varios puntos [cuadro, valor] con transiciones suaves. */
export function tw(frame: number, puntos: [number, number][]): number {
  return interpolate(
    frame,
    puntos.map((p) => p[0]),
    puntos.map((p) => p[1]),
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave },
  );
}

/** Paneo del campus en la mañana: de 0 a 300 px a lo largo de la escena. */
export function corrimientoManana(escena: TramoEscena, frame: number): number {
  return tw(frame, [
    [momentoDe(escena, 'h1', 0), 0],
    [escena.desde + escena.frames, 300],
  ]);
}

/** Pie del árbol de la rama rajada en la mañana (antes del paneo). */
export const X_ARBOL_MANANA = 1650;
/** Pie del árbol de la rama rajada en las escenas siguientes. */
export const X_ARBOL = 1350;
/** Donde brota Hespo: el `x` de h6 en guion-historia.json. */
export const X_BROTE = 1080;

/** Laptop del jefe en h8-h9. */
export const LAPTOP_SOLUCION = { x: 1080, y: 150, ancho: 1060 };
/**
 * Puntos medidos sobre las capturas del mapa al atardecer (fracción del ancho y del alto de la
 * imagen 1920×941): el pin «1» de la incidencia.
 */
export const PIN_INCIDENCIA: [number, number] = [0.704, 0.585];

/** Pin de la incidencia en coordenadas de video. */
export function pinEnVideo(): { x: number; y: number } {
  const { x, y, ancho } = LAPTOP_SOLUCION;
  const marco = ancho * 0.025;
  return { x: x - ancho / 2 + ancho * PIN_INCIDENCIA[0], y: y + marco + ((ancho * 941) / 1920) * PIN_INCIDENCIA[1] };
}

/** Sello «Cerrada»: lugar y cuadro en que aterriza (cae en 8 cuadros desde h10·0,62). */
export const SELLO = { x: 960, y: 330, caida: 8 };
export const fraccionesH10 = { inicioCorte: 0.05, cede: 0.3, cae: 0.46, foto: 0.5, sello: 0.62 } as const;
