import { shadowRadius, snapToTexels, type Vec3 } from '../shadowFit';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
/** Sol de la tarde, alto y al oeste. */
const SUN = norm([-0.6, 0.7, 0.2]);
const MAP = 4096;

describe('shadowRadius (SPEC-112 D-21)', () => {
  it('sigue a la distancia de la cámara, entre 60 y 720 m', () => {
    expect(shadowRadius(10)).toBe(60);
    expect(shadowRadius(5000)).toBe(720);
    expect(shadowRadius(300)).toBeGreaterThanOrEqual(270);
    expect(shadowRadius(300)).toBeLessThan(270 * 1.25 + 1e-9);
  });

  it('cambia en saltos de 25 %, no con cada movimiento', () => {
    expect(shadowRadius(300)).toBe(shadowRadius(305));
    const radii = new Set(Array.from({ length: 200 }, (_, i) => shadowRadius(60 + i * 5)));
    const sorted = [...radii].sort((a, b) => a - b);
    sorted.slice(1).forEach((r, i) => expect(r / sorted[i]).toBeLessThanOrEqual(1.25 + 1e-9));
    expect(sorted.length).toBeLessThan(15);
  });
});

describe('snapToTexels (SPEC-112 D-21)', () => {
  const radius = 120, texel = (2 * radius) / MAP;

  it('el centro cae en la retícula de texeles de la luz', () => {
    const p = snapToTexels([13.37, 22, -48.91], SUN, radius, MAP);
    const right = norm([SUN[2], 0, -SUN[0]]);
    const k = dot(p, right) / texel;
    expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6);
  });

  it('un desplazamiento menor que un texel no lo mueve', () => {
    const base = snapToTexels([0, 22, 0], SUN, radius, MAP);
    const moved = snapToTexels([base[0] + texel * 0.2, 22, base[2] + texel * 0.1], SUN, radius, MAP);
    moved.forEach((c, i) => expect(c).toBeCloseTo(base[i], 6));
  });

  it('con el sol en el cenit no falla', () => {
    const p = snapToTexels([5, 22, 7], [0, 1, 0], radius, MAP);
    p.forEach((c) => expect(Number.isFinite(c)).toBe(true));
  });

  it('no aleja el centro más de un texel del punto pedido', () => {
    const want: Vec3 = [101.3, 22, -77.7];
    const p = snapToTexels(want, SUN, radius, MAP);
    expect(Math.hypot(p[0] - want[0], p[1] - want[1], p[2] - want[2])).toBeLessThanOrEqual(texel * Math.SQRT2 + 1e-9);
  });
});
