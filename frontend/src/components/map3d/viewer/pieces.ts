import type { BuildingModelManifest, BuildingPiece, PlanPoint } from '@shared/types';
import { inPlanPolygon, isPlanPoint } from './planPolygon';

/**
 * Edificios que el SKP dibuja dentro de la malla de otro (SPEC-108 D-18): el café Juan Valdez venía en la malla de
 * la Librería PUCP. El visor le pasa a cada pieza los triángulos que caen enteros en su polígono; el GLB no se toca.
 */

const MIN_POLYGON_POINTS = 3;

function validate(key: string, piece: BuildingPiece, manifest: BuildingModelManifest): void {
  if (manifest.nodes[key]) throw new Error(`La pieza ${key} ya es un nodo del modelo: serían dos mallas con la misma clave`);
  if (manifest.nodes[piece.from] !== 'edificio') throw new Error(`La pieza ${key} sale de ${piece.from}, que no es la malla de un edificio del modelo`);
  if (piece.polygon.length < MIN_POLYGON_POINTS) throw new Error(`El polígono de la pieza ${key} necesita tres puntos o más`);
  if (!piece.polygon.every(isPlanPoint)) throw new Error(`El polígono de la pieza ${key} tiene un punto que no son dos números finitos`);
}

/** Las piezas del manifiesto, validadas: cada una tiene su propia clave y sale de la malla de un edificio. */
export function piecesOf(manifest: BuildingModelManifest): Map<string, BuildingPiece> {
  const out = new Map<string, BuildingPiece>();
  for (const [key, piece] of Object.entries(manifest.pieces ?? {})) {
    validate(key, piece, manifest);
    out.set(key, piece);
  }
  return out;
}

/** Separa de la malla los triángulos que caen enteros en el polígono; los demás quedan en su orden. */
export function splitPiece(p: Float32Array, polygon: PlanPoint[], key: string): { kept: Float32Array; piece: Float32Array } {
  const inside = inPlanPolygon(polygon);
  const at = (v: number) => inside(p[v], -p[v + 2]);
  const kept: number[] = [];
  const taken: number[] = [];
  for (let t = 0; t < p.length; t += 9) {
    const out = at(t) && at(t + 3) && at(t + 6) ? taken : kept;
    for (let k = t; k < t + 9; k++) out.push(p[k]);
  }
  if (!taken.length) throw new Error(`La pieza ${key} no toma nada de su malla: el manifiesto no calza con el modelo`);
  if (!kept.length) throw new Error(`La pieza ${key} se lleva toda la malla de la que sale: eso no es separar un edificio de otro`);
  return { kept: Float32Array.from(kept), piece: Float32Array.from(taken) };
}
