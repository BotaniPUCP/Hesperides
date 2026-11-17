import { describe, expect, it } from 'vitest';
import { HOJAS, MARGEN_HOJA, paralaje, rutaHoja, VERSION_FONDOS } from './papel';

const C = { x: 960, y: 470 };
/** x en pantalla de un punto de la escena desplazado por el paralaje, con zoom 1 y sin giro. */
const enPantalla = (px: number, tomaX: number, factor: number, corrimiento = 0) => C.x + (px + paralaje({ x: tomaX, y: C.y }, factor, corrimiento).x - tomaX);

describe('paralaje', () => {
  it('con factor 1 la hoja se mueve igual que la cámara y que el paneo', () => {
    expect(paralaje({ x: 1100, y: 500 }, 1, 120)).toEqual({ x: -120, y: 0 });
  });

  it('con factor 0 la hoja queda fija en pantalla aunque la cámara se mueva', () => {
    expect(enPantalla(300, 900, 0)).toBeCloseTo(enPantalla(300, 1100, 0));
  });

  it('una hoja de factor 0,5 se mueve la mitad que la cámara; una de 1,4, más', () => {
    const mov = (f: number) => enPantalla(300, 1000, f) - enPantalla(300, 900, f);
    expect(mov(1)).toBeCloseTo(-100);
    expect(mov(0.5)).toBeCloseTo(-50);
    expect(mov(1.4)).toBeCloseTo(-140);
  });

  it('el paneo del decorado también se reparte por factor', () => {
    expect(paralaje({ x: C.x, y: C.y }, 0.2, 300).x).toBeCloseTo(-60);
  });
});

describe('catálogo de hojas', () => {
  it('cada fondo tiene entre 5 y 8 hojas, con ids únicos y factores 0,2–1,4', () => {
    const ids = new Set(HOJAS.map((h) => h.id));
    expect(ids.size).toBe(HOJAS.length);
    for (const fondo of ['campus', 'oficina'] as const) {
      const n = HOJAS.filter((h) => h.fondo === fondo).length;
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(8);
    }
    for (const h of HOJAS) {
      expect(h.factor).toBeGreaterThanOrEqual(0.2);
      expect(h.factor).toBeLessThanOrEqual(1.4);
    }
  });

  it('el margen alcanza para el paralaje más extremo (factor 1,4 con paneo de 300 px)', () => {
    expect(MARGEN_HOJA).toBeGreaterThanOrEqual(0.4 * 300 + 160);
  });

  it('las rutas llevan la versión, así un PNG viejo no se usa por error', () => {
    expect(rutaHoja('suelo')).toBe(`fondos/v${VERSION_FONDOS}/suelo.png`);
  });
});
