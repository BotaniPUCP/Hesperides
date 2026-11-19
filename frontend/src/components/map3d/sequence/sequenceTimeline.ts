/**
 * La cronología de la secuencia (SPEC-118 §4 y §5.3): qué versión se ve y cuánto
 * desenfoque lleva en cada instante. El desenfoque esconde el cambio de versión.
 */

export type SequenceLook = 'low' | 'good';

export interface SequenceFrame {
  look: SequenceLook;
  blurPx: number;
  brightness: number;
  /** Opacidad del último cuadro de poca calidad, congelado encima durante el cambio. */
  frozenOpacity: number;
  /** El contenedor crece un poco con el desenfoque: así los bordes borrosos no se ven oscuros. */
  scale: number;
}

export const TRANSITION_START_S = 5;
const BLUR_RISE_S = 0.25;
const SWAP_S = 0.1;
const BLUR_FALL_S = 0.25;
export const SWAP_AT_S = TRANSITION_START_S + BLUR_RISE_S;
const SWAP_END_S = SWAP_AT_S + SWAP_S;
export const TRANSITION_END_S = SWAP_END_S + BLUR_FALL_S;

export const PEAK_BLUR_PX = 8;
export const PEAK_BRIGHTNESS = 1.04;
const PEAK_SCALE = 1.03;

const easeInOut = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

/** Cuánto desenfoque hay, de 0 a 1: sube, se mantiene durante el cambio y baja. */
function blurAmount(t: number): number {
  if (t < SWAP_AT_S) return easeInOut((t - TRANSITION_START_S) / BLUR_RISE_S);
  if (t < SWAP_END_S) return 1;
  return 1 - easeInOut((t - SWAP_END_S) / BLUR_FALL_S);
}

export function frameAt(t: number): SequenceFrame {
  const amount = blurAmount(t);
  const frozen = t >= SWAP_AT_S && t < SWAP_END_S ? 1 - easeInOut((t - SWAP_AT_S) / SWAP_S) : 0;
  return {
    look: t < SWAP_AT_S ? 'low' : 'good',
    blurPx: PEAK_BLUR_PX * amount,
    brightness: 1 + (PEAK_BRIGHTNESS - 1) * amount,
    frozenOpacity: frozen,
    scale: 1 + (PEAK_SCALE - 1) * amount,
  };
}
