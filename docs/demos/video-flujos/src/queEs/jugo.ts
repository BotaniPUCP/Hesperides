// «Jugo» de los momentos clave (receta del tenis en cuadros): anticipación de 3 a 4 cuadros,
// 1 a 2 cuadros congelados, temblor de cámara amortiguado con semilla, 8 a 14 partículas con
// semilla y una separación cromática corta. Todo depende solo del cuadro: el render es repetible.
import { random } from 'remotion';

/** Los personajes se dibujan «a dos»: el mismo dibujo dos cuadros seguidos; la cámara va «a uno». */
export const aDos = (frame: number): number => Math.floor(frame / 2) * 2;

export const CUADROS_ANTICIPACION = 4;
export const CUADROS_CONGELADOS = 2;

export type Golpe = {
  /** 0 a 1 en los cuadros previos: lo que se encoge o se carga antes del golpe. */
  anticipa: number;
  /** El golpe se sostiene: la imagen no avanza. */
  congelado: boolean;
  /** Cuadros desde el golpe sin contar los congelados (negativo antes). */
  tiempo: number;
};

export function golpe(frame: number, inicio: number): Golpe {
  const antes = inicio - frame;
  const anticipa = antes > 0 && antes <= CUADROS_ANTICIPACION ? 1 - antes / CUADROS_ANTICIPACION : 0;
  const congelado = frame >= inicio && frame < inicio + CUADROS_CONGELADOS;
  // Después del congelado el tiempo retoma desde 0: lo sostenido no se salta.
  const tiempo = frame < inicio ? frame - inicio : congelado ? 0 : frame - inicio - CUADROS_CONGELADOS;
  return { anticipa, congelado, tiempo };
}

const CUADROS_TEMBLOR = 14;

/** Temblor de cámara que decae en `CUADROS_TEMBLOR` cuadros; `amplitud` en píxeles. */
export function temblor(frame: number, inicio: number, semilla: string, amplitud = 12): { x: number; y: number; giro: number } {
  const t = frame - inicio;
  if (t < 0 || t >= CUADROS_TEMBLOR) return { x: 0, y: 0, giro: 0 };
  const caida = Math.exp(-t / 3.2);
  const s = (eje: string) => (random(`${semilla}-${eje}-${t}`) * 2 - 1) * amplitud * caida;
  return { x: s('x'), y: s('y'), giro: s('g') * 0.08 };
}

export type Particula = { x: number; y: number; radio: number; opacidad: number; tono: number };
const VIDA_PARTICULA = 26;

/** Chispas que salen del golpe: entre 8 y 14, con dirección y tamaño fijados por la semilla. */
export function particulas(frame: number, inicio: number, semilla: string, cuantas = 12): Particula[] {
  const t = frame - inicio;
  if (t < 0 || t >= VIDA_PARTICULA) return [];
  const n = Math.min(14, Math.max(8, Math.round(cuantas)));
  return Array.from({ length: n }, (_, i) => {
    const angulo = (i / n) * Math.PI * 2 + (random(`${semilla}-a${i}`) - 0.5) * 0.7;
    const rapidez = 7 + random(`${semilla}-v${i}`) * 9;
    // Frenan como si hubiera aire y caen un poco.
    const recorrido = (rapidez * (1 - Math.exp(-t / 7))) * 7;
    return {
      x: Math.cos(angulo) * recorrido,
      y: Math.sin(angulo) * recorrido + 0.12 * t * t,
      radio: 5 + random(`${semilla}-r${i}`) * 7,
      opacidad: 1 - t / VIDA_PARTICULA,
      tono: random(`${semilla}-t${i}`),
    };
  });
}

const CUADROS_CROMATICA = 6;

/** Desplazamiento en píxeles de los canales rojo y azul justo después del golpe. */
export function separacionCromatica(frame: number, inicio: number, maximo = 10): number {
  const t = frame - inicio;
  if (t < 0 || t >= CUADROS_CROMATICA) return 0;
  return maximo * (1 - t / CUADROS_CROMATICA);
}
