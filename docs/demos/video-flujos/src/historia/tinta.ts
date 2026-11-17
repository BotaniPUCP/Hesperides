// Trazos de tinta que se dibujan solos (idea de la pieza de plotter de Mia): ancho variable por
// ruido de valor con semilla (período ~26 px, 0,55–1,45), tinta más tenue donde la pluma va rápido
// y revelado con stroke-dashoffset. Todo puro y determinista.
import { random } from 'remotion';

export type Punto = [number, number];

/** Ruido de valor 1D: valores al azar cada `periodo` px, interpolados suave. En [0, 1]. */
export function ruidoValor(semilla: string, s: number, periodo = 26): number {
  const x = s / periodo;
  const i = Math.floor(x);
  const f = x - i;
  const a = random(`${semilla}-${i}`);
  const b = random(`${semilla}-${i + 1}`);
  return a + (b - a) * f * f * (3 - 2 * f);
}

/** Multiplicador del ancho del trazo en la posición `s` (px a lo largo del trazo). */
export const anchoVariable = (semilla: string, s: number): number => 0.55 + 0.9 * ruidoValor(semilla, s);

const facil = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const derivadaFacil = (t: number) => (t < 0.5 ? 12 * t * t : 3 * (-2 * t + 2) ** 2);

/** Avance del trazo (0 a 1) con aceleración y frenado, como una mano. */
export function progresoDeTrazo(frame: number, desde: number, duracion: number): number {
  return facil(Math.min(1, Math.max(0, (frame - desde) / Math.max(1, duracion))));
}

/** stroke-dashoffset que deja ver la fracción `progreso` de un trazo de largo `total`. */
export const desplazamientoGuion = (total: number, progreso: number): number => total * (1 - progreso);

/**
 * Opacidad de la tinta en la fracción `u` del largo: la pluma va más rápido al medio (curva de
 * aceleración) y deja menos tinta. Entre 0,6 y 1.
 */
export function opacidadPorVelocidad(u: number): number {
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (facil(mid) < u) lo = mid;
    else hi = mid;
  }
  const v = derivadaFacil((lo + hi) / 2) / 1.5;
  return 1 - 0.4 * Math.min(1, v);
}

const PASO = 4;

function linea(a: Punto, b: Punto, incluirFinal: boolean): Punto[] {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / PASO));
  const pts: Punto[] = [];
  for (let i = 0; i < n + (incluirFinal ? 1 : 0); i++) pts.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  return pts;
}

/** Contorno cerrado de un rectángulo redondeado, en sentido horario desde arriba a la izquierda. */
export function rectRedondeado(x: number, y: number, w: number, h: number, r: number): Punto[] {
  const pts: Punto[] = [];
  const esquina = (cx: number, cy: number, desde: number) => {
    if (r <= 0) return;
    for (let i = 1; i < 12; i++) {
      const a = desde + (Math.PI / 2) * (i / 12);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  pts.push(...linea([x + r, y], [x + w - r, y], true));
  esquina(x + w - r, y + r, -Math.PI / 2);
  pts.push(...linea([x + w, y + r], [x + w, y + h - r], true));
  esquina(x + w - r, y + h - r, 0);
  pts.push(...linea([x + w - r, y + h], [x + r, y + h], true));
  esquina(x + r, y + h - r, Math.PI / 2);
  pts.push(...linea([x, y + h - r], [x, y + r], true));
  esquina(x + r, y + r, Math.PI);
  pts.push([x + r, y]);
  return pts;
}

/** Curva de Bézier cúbica muestreada cada ~4 px. */
export function bezier(p0: Punto, p1: Punto, p2: Punto, p3: Punto): Punto[] {
  const aprox = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
  const n = Math.max(8, Math.ceil(aprox / PASO));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]] as Punto;
  });
}

export type Recorrido = { puntos: Punto[]; largos: number[]; total: number };

export function recorrido(puntos: Punto[]): Recorrido {
  const largos = [0];
  for (let i = 1; i < puntos.length; i++) largos.push(largos[i - 1] + Math.hypot(puntos[i][0] - puntos[i - 1][0], puntos[i][1] - puntos[i - 1][1]));
  return { puntos, largos, total: largos[largos.length - 1] };
}

export type Segmento = { puntos: [Punto, Punto, Punto, Punto]; ancho: number; opacidad: number };

/** El trazo completo como cuadriláteros contiguos: ancho variable y opacidad por velocidad. */
export function segmentosDeTinta(r: Recorrido, { semilla, ancho }: { semilla: string; ancho: number }): Segmento[] {
  const { puntos, largos, total } = r;
  const normal = (i: number): Punto => {
    const a = puntos[Math.max(0, i - 1)];
    const b = puntos[Math.min(puntos.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const borde = (i: number, lado: 1 | -1): Punto => {
    const n = normal(i);
    const w = (ancho * anchoVariable(semilla, largos[i])) / 2;
    return [puntos[i][0] + lado * n[0] * w, puntos[i][1] + lado * n[1] * w];
  };
  const segmentos: Segmento[] = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    if (largos[i + 1] - largos[i] < 1e-6) continue;
    const medio = (largos[i] + largos[i + 1]) / 2;
    segmentos.push({
      puntos: [borde(i, 1), borde(i + 1, 1), borde(i + 1, -1), borde(i, -1)],
      ancho: ancho * anchoVariable(semilla, largos[i]),
      opacidad: opacidadPorVelocidad(total > 0 ? medio / total : 0),
    });
  }
  return segmentos;
}
