import { describe, expect, it } from 'vitest';
import type { Linea, TramoEscena } from '../src/tiempos';
import { compararPixeles, fraccionRotada, leerClaves, metricaParpadeo, muestrasDeRevision } from './revision';

const tramo = (id: string, desde: number, frames: number) => ({ frase: { id, texto: id, hespo: { x: 0, pose: 'quieto' } }, escenaId: 'manana', desde, frames, archivo: `${id}.mp3` });
const escena = (id: string, desde: number, frames: number, frases: ReturnType<typeof tramo>[]) => ({ id, desde, frames, frases }) as unknown as TramoEscena;
const LINEA: Linea = {
  escenas: [escena('manana', 0, 300, [tramo('h1', 0, 140), tramo('h2', 148, 152)]), escena('hoy', 318, 200, [tramo('h3', 318, 200)])],
  framesTotales: 518,
};

describe('muestrasDeRevision', () => {
  it('toma inicio, mitad y final de cada escena', () => {
    const m = muestrasDeRevision(LINEA, { corrida: 1, claves: [], porFrase: false });
    const manana = m.filter((x) => x.escena === 'manana');
    expect(manana.map((x) => x.tipo)).toEqual(['inicio', 'mitad', 'final']);
    expect(manana[0].frame).toBe(0);
    expect(manana[2].frame).toBe(299);
    expect(manana[1].frame).toBeGreaterThan(0);
    expect(manana[1].frame).toBeLessThan(299);
  });

  it('rota la mitad entre corridas pero repite la misma con la misma corrida', () => {
    const mitades = (corrida: number) => muestrasDeRevision(LINEA, { corrida, claves: [], porFrase: true }).filter((x) => x.tipo !== 'inicio' && x.tipo !== 'final').map((x) => x.frame);
    expect(mitades(3)).toEqual(mitades(3));
    const distintas = new Set([1, 2, 3, 4, 5].map((c) => mitades(c).join(',')));
    expect(distintas.size).toBeGreaterThan(1);
  });

  it('agrega los momentos clave pedidos y una muestra por frase', () => {
    const m = muestrasDeRevision(LINEA, { corrida: 1, claves: [{ id: 'h2', fraccion: 0.5 }], porFrase: true });
    expect(m.find((x) => x.tipo === 'clave')).toMatchObject({ frame: 148 + 76, etiqueta: 'h2@0.5' });
    expect(m.filter((x) => x.tipo === 'frase')).toHaveLength(3);
    // Ordenadas por fotograma y sin repetidos.
    const frames = m.map((x) => x.frame);
    expect(frames).toEqual([...new Set(frames)].sort((a, b) => a - b));
  });

  it('falla si una clave nombra una frase que no existe', () => {
    expect(() => muestrasDeRevision(LINEA, { corrida: 1, claves: [{ id: 'h99', fraccion: 0 }], porFrase: false })).toThrow(/h99/);
  });
});

describe('fraccionRotada', () => {
  it('queda dentro del rango y depende de la corrida', () => {
    for (let c = 0; c < 20; c++) {
      const f = fraccionRotada(c, 'manana', 0.3, 0.7);
      expect(f).toBeGreaterThanOrEqual(0.3);
      expect(f).toBeLessThanOrEqual(0.7);
    }
    expect(fraccionRotada(1, 'x')).not.toBe(fraccionRotada(2, 'x'));
  });
});

describe('leerClaves', () => {
  it('lee pares frase:fraccion separados por comas', () => {
    expect(leerClaves('h2:0.4, h10:0.47')).toEqual([
      { id: 'h2', fraccion: 0.4 },
      { id: 'h10', fraccion: 0.47 },
    ]);
    expect(leerClaves('')).toEqual([]);
    expect(() => leerClaves('h2')).toThrow();
  });
});

describe('metricaParpadeo', () => {
  const imagen = (ancho: number, alto: number, color: (x: number, y: number) => number) => {
    const datos = new Uint8Array(ancho * alto * 3);
    for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) datos.fill(color(x, y), (y * ancho + x) * 3, (y * ancho + x) * 3 + 3);
    return datos;
  };

  it('es cero entre dos cuadros iguales', () => {
    const a = imagen(32, 18, () => 100);
    expect(metricaParpadeo(a, a, 32, 18)).toMatchObject({ global: 0, peorCelda: 0 });
  });

  it('ignora cambios menores al umbral (26/255)', () => {
    const a = imagen(32, 18, () => 100);
    const b = imagen(32, 18, () => 126);
    expect(metricaParpadeo(a, b, 32, 18).global).toBe(0);
    const c = imagen(32, 18, () => 127);
    expect(metricaParpadeo(a, c, 32, 18).global).toBe(1);
  });

  it('localiza el cambio en su celda de la grilla 16×9', () => {
    // 32×18: cada celda es de 2×2 píxeles. Cambia solo la celda (0,0).
    const a = imagen(32, 18, () => 0);
    const b = imagen(32, 18, (x, y) => (x < 2 && y < 2 ? 255 : 0));
    const m = metricaParpadeo(a, b, 32, 18);
    expect(m.peorCelda).toBe(1);
    expect(m.celdas).toHaveLength(16 * 9);
    expect(m.global).toBeCloseTo(1 / 144);
  });
});

describe('compararPixeles', () => {
  it('cuenta los píxeles distintos', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5, 6]);
    expect(compararPixeles(a, a)).toEqual({ iguales: true, distintos: 0 });
    expect(compararPixeles(a, new Uint8Array([1, 2, 3, 4, 5, 7]))).toEqual({ iguales: false, distintos: 1 });
  });
});
