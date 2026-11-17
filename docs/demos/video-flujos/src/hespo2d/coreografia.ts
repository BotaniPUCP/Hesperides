// PRUEBA DESECHABLE (spike): la intención de Hespo en cada cuadro de la demo de 10 s.
// La simulación (simulacion.ts) convierte esta intención en movimiento con inercia.
import { Easing, interpolate } from 'remotion';

export const INICIO_VOZ = 40;
export const DURACION_DEMO = 300;

const ent = (f: number, a: number, b: number, desde: number, hasta: number, easing = Easing.inOut(Easing.sin)) =>
  interpolate(f, [a, b], [desde, hasta], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

/** Lo que Hespo quiere hacer: los resortes lo siguen con retraso, rebote y anticipación. */
export type Objetivo = {
  /** Grados: 0 = brazo colgando, 90 = horizontal hacia afuera, 180 = arriba. */
  brazoI: number;
  brazoD: number;
  /** Grados; positivo = se inclina hacia adelante (a la derecha). */
  inclina: number;
  miradaX: number;
  miradaY: number;
  /** 0 = de pie, 1 = agachado para saltar. */
  agachado: number;
  ojos: 'abiertos' | 'felices';
  mano: 'abierta' | 'pulgar';
};

/** Fase de caminata y cuánto camina (0 a 1). */
export function caminata(f: number): { fase: number; w: number; x: number } {
  const x = ent(f, 206, 250, 0, 220);
  return { x, fase: x / (4 * PASO_MEDIO), w: interpolate(f, [202, 212, 244, 252], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
}
/** Medio paso en píxeles locales de Hespo. */
export const PASO_MEDIO = 16;

/** Altura de los pies sobre el suelo (px de video): la caída, el rebote, los saltitos y el salto final. */
export function altura(f: number): number {
  if (f < 22) return 560 * (1 - (f / 22) ** 2); // cae con gravedad
  if (f < 34) return 30 * Math.sin((Math.PI * (f - 22)) / 12); // rebote
  if (f >= 176 && f < 186) return 14 * Math.sin((Math.PI * (f - 176)) / 10); // saltito al decir «Hesperides»
  if (f >= 272 && f < 290) return 140 * Math.sin((Math.PI * (f - 272)) / 18); // salto de alegría
  const { fase, w } = caminata(f);
  return w * 7 * Math.abs(Math.sin(2 * Math.PI * fase)); // rebote de cada paso
}

export type Emocion = 'neutral' | 'feliz' | 'sorpresa' | 'pensativo' | 'triste';

/** Cuadros en que aterriza: para el polvo. */
export const ATERRIZAJES = [22, 290];

/** La emoción de cada momento de la demo: mueve párpados, cejas, boca y hojas. */
export function emocion(f: number): Emocion {
  if (f < 34) return 'sorpresa';
  if (f < 72) return 'feliz';
  if (f < 98) return 'pensativo';
  if (f >= 172 && f < 192) return 'feliz';
  if (f >= 252 && f < 264) return 'pensativo';
  if (f >= 272) return 'feliz';
  return 'neutral';
}

export function objetivo(f: number): Objetivo {
  const { fase, w } = caminata(f);
  const balanceo = w * 18 * Math.sin(2 * Math.PI * fase);

  // Saludo: anticipación (baja un poco el brazo) y luego arriba con vaivén.
  const saludo = ent(f, 36, 46, 0, 1) - ent(f, 98, 108, 0, 1);
  const vaiven = Math.sin(((f - 46) / 30) * 2 * Math.PI * 2.3) * 24 * saludo;
  const anticipaSaludo = ent(f, 32, 38, 0, 1) - ent(f, 38, 44, 0, 1);
  // «Y para eso existe Hesperides»: abre los brazos para presentar.
  const presenta = ent(f, 110, 122, 0, 1) - ent(f, 192, 204, 0, 1);
  // Antes de saltar se agacha y echa los brazos atrás; en el aire, arriba; al caer, pulgar.
  const agachado = ent(f, 260, 270, 0, 1, Easing.out(Easing.quad)) - ent(f, 270, 274, 0, 1);
  const arriba = ent(f, 271, 276, 0, 1) - ent(f, 288, 296, 0, 1);
  const pulgar = ent(f, 288, 296, 0, 1);

  return {
    brazoI: 8 - anticipaSaludo * 4 + presenta * 62 + balanceo - agachado * 22 + arriba * 150 + pulgar * 0,
    brazoD: 8 - anticipaSaludo * 18 + saludo * 142 + vaiven + presenta * 62 - balanceo - agachado * 22 + arriba * 150 + pulgar * 70,
    inclina: -3 * anticipaSaludo + 4 * presenta - 4 * ent(f, 198, 206, 0, 1) + 4 * ent(f, 206, 212, 0, 1) - 4 * w * 0 + 5 * agachado,
    // La mirada salta (sacadas): a cámara, al costado, arriba al decir el nombre, hacia adonde camina.
    miradaX: f < 70 ? 0 : f < 96 ? -0.5 : f < 150 ? 0 : f < 176 ? 0.35 : f < 200 ? 0 : f < 252 ? 0.8 : f < 258 ? -0.3 : 0,
    miradaY: f < 150 ? 0 : f < 176 ? -0.5 : f >= 262 && f < 272 ? 0.3 : 0,
    agachado,
    ojos: f >= 274 || (f >= 176 && f < 190) ? 'felices' : 'abiertos',
    mano: pulgar > 0.5 ? 'pulgar' : 'abierta',
  };
}
