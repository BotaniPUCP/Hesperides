import type { BuildingModelManifest } from '@shared/types';

/**
 * Ajustes por edificio del modelo del plano (SPEC-108 D-16): mover y estirar en planta la malla de un edificio
 * para que encaje con el pasto, sin tocar el GLB. La matriz va en metros alrededor del anclaje (x este, y norte):
 * x' = a·x + b·y + e, y' = c·x + d·y + f.
 */
export type AdjustmentMatrix = readonly [number, number, number, number, number, number];

/** Por debajo, la malla queda volteada o aplastada a menos de un tercio: es un error de datos, no un ajuste. */
const MIN_DETERMINANT = 0.1;

/** Los ajustes del manifiesto, validados: solo de mallas de edificio y con matrices que no voltean ni aplastan. */
export function adjustmentsOf(manifest: BuildingModelManifest): Map<string, AdjustmentMatrix> {
  const out = new Map<string, AdjustmentMatrix>();
  for (const [key, adjustment] of Object.entries(manifest.adjustments ?? {})) {
    if (manifest.nodes[key] !== 'edificio') throw new Error(`El ajuste de ${key} no es de la malla de un edificio del modelo`);
    const m = adjustment.matrix;
    if (!Array.isArray(m) || m.length !== 6 || !m.every(Number.isFinite)) throw new Error(`El ajuste de ${key} no es una matriz de seis números`);
    if (m[0] * m[3] - m[1] * m[2] < MIN_DETERMINANT) throw new Error(`El ajuste de ${key} voltea o aplasta la malla`);
    out.set(key, m);
  }
  return out;
}

/** Posiciones del modelo (x este, y arriba, z = −norte) con el ajuste aplicado en planta; la altura queda igual. */
export function adjusted(p: Float32Array, m: AdjustmentMatrix): Float32Array {
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = -p[i + 2];
    out[i] = m[0] * x + m[1] * y + m[4];
    out[i + 1] = p[i + 1];
    out[i + 2] = -(m[2] * x + m[3] * y + m[5]);
  }
  return out;
}

/** Un anillo plano [x0, y0, x1, y1…] en metros alrededor del anclaje, con el mismo ajuste que su malla. */
export function adjustedRing(ring: readonly number[], m: AdjustmentMatrix): number[] {
  const out: number[] = [];
  for (let i = 0; i < ring.length; i += 2) out.push(m[0] * ring[i] + m[1] * ring[i + 1] + m[4], m[2] * ring[i] + m[3] * ring[i + 1] + m[5]);
  return out;
}
