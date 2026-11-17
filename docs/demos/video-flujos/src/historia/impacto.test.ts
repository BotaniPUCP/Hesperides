import { describe, expect, it } from 'vitest';
import { guionHistoria } from '../guion';
import { construirLinea, type Manifiesto } from '../tiempos';
import { cuadroConPausa, destelloDeImpacto, efectoDeGolpes, golpesDeHistoria, particulas, sacudida, separacionCromatica } from './impacto';

describe('sacudida', () => {
  it('es cero antes del golpe y se amortigua bajo la envolvente amp·e^(−k·t)', () => {
    expect(sacudida(-1, { amp: 20, k: 0.3, semilla: 'a' })).toEqual({ x: 0, y: 0, giro: 0 });
    for (let t = 0; t < 40; t++) {
      const s = sacudida(t, { amp: 20, k: 0.3, semilla: 'a' });
      const tope = 20 * Math.exp(-0.3 * t) + 1e-9;
      expect(Math.abs(s.x)).toBeLessThanOrEqual(tope);
      expect(Math.abs(s.y)).toBeLessThanOrEqual(tope);
    }
    expect(Math.abs(sacudida(30, { amp: 20, k: 0.3, semilla: 'a' }).x)).toBeLessThan(0.01);
  });

  it('es determinista y su fase depende de la semilla', () => {
    const a = sacudida(3, { amp: 20, k: 0.2, semilla: 'rama' });
    expect(sacudida(3, { amp: 20, k: 0.2, semilla: 'rama' })).toEqual(a);
    expect(sacudida(3, { amp: 20, k: 0.2, semilla: 'sello' })).not.toEqual(a);
  });
});

describe('cuadroConPausa (hit-stop)', () => {
  it('congela la animación local durante la pausa y luego retoma el reloj sin desfasar la voz', () => {
    const pausas = [{ frame: 100, cuadros: 2 }];
    expect(cuadroConPausa(99, pausas)).toBe(99);
    expect(cuadroConPausa(100, pausas)).toBe(100);
    expect(cuadroConPausa(101, pausas)).toBe(100);
    expect(cuadroConPausa(102, pausas)).toBe(100);
    expect(cuadroConPausa(103, pausas)).toBe(103);
  });
});

describe('destelloDeImpacto', () => {
  it('es blanco pleno en el golpe y desaparece en dos cuadros', () => {
    expect(destelloDeImpacto(-1)).toBe(0);
    expect(destelloDeImpacto(0)).toBe(1);
    expect(destelloDeImpacto(1)).toBeGreaterThan(0);
    expect(destelloDeImpacto(1)).toBeLessThan(1);
    expect(destelloDeImpacto(2)).toBe(0);
  });
});

describe('particulas', () => {
  it('lanza entre 8 y 14 partículas deterministas desde el origen', () => {
    for (const semilla of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const p = particulas(semilla, 0, { x: 100, y: 200 });
      expect(p.length).toBeGreaterThanOrEqual(8);
      expect(p.length).toBeLessThanOrEqual(14);
      for (const q of p) {
        expect(q.x).toBeCloseTo(100);
        expect(q.y).toBeCloseTo(200);
      }
    }
    expect(particulas('a', 5, { x: 0, y: 0 })).toEqual(particulas('a', 5, { x: 0, y: 0 }));
  });

  it('se apagan con el tiempo y no existen antes del golpe', () => {
    expect(particulas('a', -1, { x: 0, y: 0 })).toEqual([]);
    expect(particulas('a', 40, { x: 0, y: 0 }, { vida: 20 })).toEqual([]);
    const p = particulas('a', 10, { x: 0, y: 0 }, { vida: 20 });
    expect(p.every((q) => q.opacidad > 0 && q.opacidad < 1)).toBe(true);
  });
});

describe('particulas hacia abajo', () => {
  it('con hacia: 1 salen hacia abajo (polvo bajo un sello)', () => {
    const p = particulas('s', 2, { x: 0, y: 0 }, { hacia: 1, gravedad: 0 });
    expect(p.every((q) => q.y > 0)).toBe(true);
    const arriba = particulas('s', 2, { x: 0, y: 0 }, { gravedad: 0 });
    expect(arriba.every((q) => q.y < 0)).toBe(true);
  });
});

describe('separacionCromatica', () => {
  it('parte del máximo y decae a cero en unos 8 cuadros', () => {
    expect(separacionCromatica(-1, 6)).toBe(0);
    expect(separacionCromatica(0, 6)).toBe(6);
    for (let t = 1; t < 8; t++) expect(separacionCromatica(t, 6)).toBeLessThan(separacionCromatica(t - 1, 6));
    expect(separacionCromatica(8, 6)).toBe(0);
  });
});

describe('golpes de la historia', () => {
  const manifiesto: Manifiesto = {
    voz: guionHistoria.voz,
    frases: Object.fromEntries(guionHistoria.escenas.flatMap((e) => e.frases).map((f) => [f.id, { archivo: `${f.id}.mp3`, duracion: 4, texto: f.textoVoz ?? f.texto }])),
  };
  const linea = construirLinea(guionHistoria, manifiesto);
  const golpes = golpesDeHistoria(linea);

  it('marca la grieta, el brote de Hespo, el mapa, la caída de la rama y el sello, en orden', () => {
    expect(golpes.map((g) => g.id)).toEqual(['grieta', 'brote', 'mapa', 'caida', 'sello']);
    const frames = golpes.map((g) => g.frame);
    expect(frames).toEqual([...frames].sort((a, b) => a - b));
  });

  it('combina sacudida, cromática y destello solo cerca de cada golpe', () => {
    const lejos = efectoDeGolpes(golpes, 0);
    expect(lejos).toMatchObject({ x: 0, y: 0, giro: 0, cromatica: 0, blanco: 0 });
    const caida = golpes.find((g) => g.id === 'caida')!;
    const enGolpe = efectoDeGolpes(golpes, caida.frame);
    expect(enGolpe.cromatica).toBeGreaterThan(0);
    expect(efectoDeGolpes(golpes, caida.frame + 60).cromatica).toBe(0);
  });
});
