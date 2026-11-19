import type { Polygon } from '../sceneData';
import { boxOf, cross, MIN_PLAN_AREA_M2, overlaps, ringPoints, signedArea, subtractTriangle, triangulated, type P } from './planClip';
import type { PlanNode } from './planModel';

/**
 * El piso del modelo se abre sobre los céspedes (D-19). En los desniveles el suelo del mapa se abre (D-09) y se ve
 * el piso del SKP, que a veces tapa un área verde de la base: sus triángulos son enormes (uno mide 4 163 m²) y no
 * siguen a los jardines. Se recortan para quitarles la parte que cae en un césped; debajo queda el jardín hundido.
 * Pedido de Jean Piero del 15 nov 2026 (AV-0480 y AV-0409): ninguna parte del piso cubre un césped.
 */

interface Lawn {
  t: P[];
  box: ReturnType<typeof boxOf>;
}

/** Las coordenadas de un punto de la planta de un triángulo como mezcla de sus vértices. */
function weights(tri: P[], p: P): [number, number, number] {
  const d = cross(tri[0], tri[1], tri[2]);
  const w0 = cross(tri[1], tri[2], p) / d, w1 = cross(tri[2], tri[0], p) / d;
  return [w0, w1, 1 - w0 - w1];
}

/** Lo que queda de un triángulo del piso fuera de los céspedes, en partes convexas; nulo si ninguno lo toca. */
function remainder(tri: P[], lawns: Lawn[]): P[][] | null {
  const box = boxOf(tri);
  const near = lawns.filter((l) => overlaps(box, l.box));
  if (!near.length) return null;
  return near.reduce((parts, lawn) => parts.flatMap((part) => subtractTriangle(part, lawn.t)), [tri]);
}

/**
 * El piso sin los céspedes, en su marco (el del modelo: y arriba, z al sur). Los céspedes vienen en el plano de la
 * escena y el modelo se ubica corrido `offset` en ella. Lo que queda conserva la cota, la textura y el giro.
 */
export function floorWithoutLawns(floor: PlanNode, lawns: Polygon[][], offset: { x: number; z: number }): PlanNode {
  const pieces: Lawn[] = lawns.flatMap(triangulated).map((t) => ({ t, box: boxOf(t) }));
  const { positions: src, uv } = floor;
  const pos: number[] = [], tex: number[] = [];
  for (let v = 0; v < src.length / 3; v += 3) {
    const tri: P[] = [0, 1, 2].map((k) => [src[(v + k) * 3] + offset.x, -(src[(v + k) * 3 + 2] + offset.z)]);
    const parts = Math.abs(signedArea(tri)) < MIN_PLAN_AREA_M2 ? null : remainder(tri, pieces);
    if (!parts) {
      for (let k = 0; k < 3; k++) {
        pos.push(src[(v + k) * 3], src[(v + k) * 3 + 1], src[(v + k) * 3 + 2]);
        if (uv) tex.push(uv[(v + k) * 2], uv[(v + k) * 2 + 1]);
      }
      continue;
    }
    const emit = (p: P) => {
      const w = weights(tri, p);
      const mix = (array: Float32Array, stride: number, i: number) => w.reduce((s, wk, k) => s + wk * array[(v + k) * stride + i], 0);
      pos.push(p[0] - offset.x, mix(src, 3, 1), -p[1] - offset.z);
      if (uv) tex.push(mix(uv, 2, 0), mix(uv, 2, 1));
    };
    const turn = Math.sign(signedArea(tri));
    for (const part of parts) {
      const same = Math.sign(signedArea(part)) === turn ? part : [...part].reverse();
      for (let k = 1; k + 1 < same.length; k++) [same[0], same[k], same[k + 1]].forEach(emit);
    }
  }
  return { positions: new Float32Array(pos), uv: uv ? new Float32Array(tex) : null };
}

const polygonsBox = (g: Polygon[]) => boxOf(g.flatMap((polygon) => ringPoints(polygon[0])));

/** Los céspedes que tocan un desnivel: fuera de ellos el piso queda bajo el suelo del mapa, que los dibuja. */
export function lawnsOverSunken(lawns: Polygon[][], sunken: Polygon[][]): Polygon[][] {
  const boxes = sunken.map(polygonsBox);
  return lawns.filter((g) => {
    const box = polygonsBox(g);
    return boxes.some((b) => overlaps(box, b));
  });
}
