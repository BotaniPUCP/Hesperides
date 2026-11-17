import { describe, expect, test } from 'vitest';
import { campoDeAtencion } from './campo';

const focos = [
  { x: 600, y: 400, peso: 1 },
  { x: 1300, y: 600, peso: 0.6 },
];

describe('campo generativo de «zonas de más atención»', () => {
  test('da las partículas pedidas, siempre iguales para el mismo cuadro', () => {
    const a = campoDeAtencion(120, focos, 'z', 180);
    expect(a).toHaveLength(180);
    expect(campoDeAtencion(120, focos, 'z', 180)).toEqual(a);
  });

  test('se mueve despacio: de un cuadro al siguiente cada partícula avanza poco', () => {
    const a = campoDeAtencion(120, focos, 'z', 120);
    const b = campoDeAtencion(121, focos, 'z', 120);
    a.forEach((p, i) => {
      // Cuando una partícula renace salta; las demás avanzan menos de 4 px por cuadro.
      if (b[i].edad > a[i].edad) expect(Math.hypot(b[i].x - p.x, b[i].y - p.y)).toBeLessThan(4);
    });
  });

  test('se junta alrededor de los focos: casi todas cerca de alguno', () => {
    const cerca = campoDeAtencion(200, focos, 'z', 300).filter((p) => focos.some((f) => Math.hypot(p.x - f.x, p.y - f.y) < 320));
    expect(cerca.length / 300).toBeGreaterThan(0.9);
  });

  test('el foco con más peso tiene más partículas', () => {
    const ps = campoDeAtencion(60, focos, 'z', 400);
    const de = (f: (typeof focos)[number]) => ps.filter((p) => Math.hypot(p.x - f.x, p.y - f.y) < 320).length;
    expect(de(focos[0])).toBeGreaterThan(de(focos[1]));
  });

  test('aparecen y se apagan con suavidad (opacidad entre 0 y 1) y tienen estela', () => {
    campoDeAtencion(90, focos, 'z', 100).forEach((p) => {
      expect(p.opacidad).toBeGreaterThanOrEqual(0);
      expect(p.opacidad).toBeLessThanOrEqual(1);
      expect(p.estela.length).toBeGreaterThan(1);
    });
  });

  test('sin focos no hay campo', () => {
    expect(campoDeAtencion(10, [], 'z', 50)).toEqual([]);
  });
});
