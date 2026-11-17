import { describe, expect, test } from 'vitest';
import { aDos, golpe, particulas, separacionCromatica, temblor } from './jugo';

describe('a dos: los personajes cambian de dibujo cada dos cuadros', () => {
  test('redondea hacia abajo al par', () => {
    expect([0, 1, 2, 3, 10, 11].map(aDos)).toEqual([0, 0, 2, 2, 10, 10]);
  });
});

describe('golpe: anticipación, congelado y después', () => {
  test('antes de la anticipación no pasa nada', () => {
    expect(golpe(80, 100)).toEqual({ anticipa: 0, congelado: false, tiempo: -20 });
  });

  test('la anticipación crece en los 4 cuadros previos', () => {
    expect(golpe(96, 100).anticipa).toBe(0);
    expect(golpe(98, 100).anticipa).toBeCloseTo(0.5);
    expect(golpe(99, 100).anticipa).toBeCloseTo(0.75);
  });

  test('el golpe congela 2 cuadros y el tiempo sigue desde 0 sin saltar', () => {
    expect(golpe(100, 100)).toEqual({ anticipa: 0, congelado: true, tiempo: 0 });
    expect(golpe(101, 100)).toEqual({ anticipa: 0, congelado: true, tiempo: 0 });
    expect(golpe(102, 100).tiempo).toBe(0);
    expect(golpe(103, 100).tiempo).toBe(1);
  });
});

describe('temblor de cámara', () => {
  test('es cero fuera de su ventana', () => {
    expect(temblor(99, 100, 's')).toEqual({ x: 0, y: 0, giro: 0 });
    expect(temblor(130, 100, 's')).toEqual({ x: 0, y: 0, giro: 0 });
  });

  test('es el mismo para el mismo cuadro y la misma semilla', () => {
    expect(temblor(104, 100, 's')).toEqual(temblor(104, 100, 's'));
    expect(temblor(104, 100, 's')).not.toEqual(temblor(104, 100, 'otra'));
  });

  test('se amortigua: no supera la amplitud y al final es casi nada', () => {
    for (let f = 100; f < 114; f++) {
      const t = temblor(f, 100, 's', 12);
      expect(Math.abs(t.x)).toBeLessThanOrEqual(12);
      expect(Math.abs(t.y)).toBeLessThanOrEqual(12);
    }
    expect(Math.abs(temblor(113, 100, 's', 12).x)).toBeLessThan(1.5);
  });
});

describe('partículas', () => {
  test('son entre 8 y 14, aunque se pidan más o menos', () => {
    expect(particulas(105, 100, 's', 3)).toHaveLength(8);
    expect(particulas(105, 100, 's', 40)).toHaveLength(14);
    expect(particulas(105, 100, 's')).toHaveLength(12);
  });

  test('no hay antes del golpe ni después de su vida', () => {
    expect(particulas(99, 100, 's')).toEqual([]);
    expect(particulas(140, 100, 's')).toEqual([]);
  });

  test('salen del centro y se desvanecen', () => {
    const inicio = particulas(100, 100, 's');
    const luego = particulas(115, 100, 's');
    inicio.forEach((p) => expect(Math.hypot(p.x, p.y)).toBeLessThan(1e-9));
    luego.forEach((p, i) => {
      expect(Math.hypot(p.x, p.y)).toBeGreaterThan(0);
      expect(p.opacidad).toBeLessThan(inicio[i].opacidad);
    });
  });

  test('son las mismas en cada render', () => {
    expect(particulas(108, 100, 's')).toEqual(particulas(108, 100, 's'));
  });
});

describe('separación cromática', () => {
  test('dura poco y baja a cero', () => {
    expect(separacionCromatica(99, 100)).toBe(0);
    expect(separacionCromatica(100, 100)).toBeGreaterThan(0);
    expect(separacionCromatica(103, 100)).toBeLessThan(separacionCromatica(100, 100));
    expect(separacionCromatica(106, 100)).toBe(0);
  });
});
