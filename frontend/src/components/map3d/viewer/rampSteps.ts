/**
 * La geometría de una rampa escalonada (SPEC-108 D-20). Funciones puras sobre puntos [este, norte, cota]: un
 * triángulo inclinado se corta por las cotas de los escalones; cada franja es una huella horizontal a la cota de
 * arriba de la franja (así el escalón nunca baja de la rampa) y en cada corte se levanta una contrahuella vertical.
 */

/** Un punto en planta con su cota: [este, norte, cota]. */
export type P3 = [number, number, number];

/** Por debajo de esto, un largo o un área es cero: el manifiesto y el modelo van al milímetro. */
const EPS = 1e-9;

const lerp = (a: P3, b: P3, t: number): P3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** El área con signo de la planta de un polígono: el giro de sus vértices vistos desde arriba. */
export function planArea(ps: P3[]): number {
  return ps.reduce((s, p, i) => { const q = ps[(i + 1) % ps.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
}

/** La parte de un polígono convexo de un lado de una cota: `above` deja lo que queda por encima. */
function clipAt(poly: P3[], level: number, above: boolean): P3[] {
  const keep = (p: P3) => (above ? p[2] >= level : p[2] <= level);
  const out: P3[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    if (keep(p)) out.push(p);
    if (keep(p) !== keep(q)) out.push(lerp(p, q, (level - p[2]) / (q[2] - p[2])));
  });
  return out;
}

/** Los puntos donde la cota corta el triángulo: un tramo si el corte lo cruza o va por un borde. */
function cutAt(tri: P3[], level: number): P3[] {
  const points: P3[] = [];
  tri.forEach((p, i) => {
    const q = tri[(i + 1) % 3];
    if (Math.abs(p[2] - level) < EPS) points.push(p);
    else if ((p[2] - level) * (q[2] - level) < 0) points.push(lerp(p, q, (level - p[2]) / (q[2] - p[2])));
  });
  return points.filter((p, i) => points.findIndex((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < EPS) === i);
}

/** Hacia dónde sube el plano del triángulo, en planta. */
function uphill([a, b, c]: P3[]): [number, number] {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  return [-n[0] / n[2], -n[1] / n[2]];
}

/** Huellas (triángulos horizontales) y contrahuellas (cuadriláteros verticales que miran hacia abajo) de un triángulo. */
export function stepTriangle(tri: P3[], levels: number[]): { treads: P3[][]; risers: P3[][] } {
  const treads: P3[][] = [], risers: P3[][] = [];
  const top = Math.max(...tri.map((p) => p[2]));
  const [gx, gy] = uphill(tri);
  for (let k = 0; k + 1 < levels.length; k++) {
    const band = clipAt(clipAt(tri, levels[k], true), levels[k + 1], false);
    if (band.length >= 3 && Math.abs(planArea(band)) > EPS) {
      const flat = band.map((p): P3 => [p[0], p[1], levels[k + 1]]);
      for (let i = 1; i + 1 < flat.length; i++) treads.push([flat[0], flat[i], flat[i + 1]]);
    }
    // La contrahuella de un corte la pone el triángulo que sigue subiendo desde él: así no sale dos veces.
    const cut = cutAt(tri, levels[k]);
    if (cut.length !== 2 || top <= levels[k] + EPS) continue;
    let [p, q] = cut;
    if ((q[1] - p[1]) * gx - (q[0] - p[0]) * gy > 0) [p, q] = [q, p];
    risers.push([[p[0], p[1], levels[k]], [q[0], q[1], levels[k]], [q[0], q[1], levels[k + 1]], [p[0], p[1], levels[k + 1]]]);
  }
  return { treads, risers };
}
