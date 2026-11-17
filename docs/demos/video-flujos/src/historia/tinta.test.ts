import { describe, expect, it } from 'vitest';
import { anchoVariable, bezier, desplazamientoGuion, opacidadPorVelocidad, progresoDeTrazo, recorrido, rectRedondeado, ruidoValor, segmentosDeTinta } from './tinta';

describe('ruidoValor', () => {
  it('queda en [0, 1], es determinista y continuo', () => {
    for (let s = 0; s < 500; s += 3.7) {
      const v = ruidoValor('a', s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(ruidoValor('a', s)).toBe(v);
      expect(Math.abs(ruidoValor('a', s + 0.5) - v)).toBeLessThan(0.1);
    }
  });

  it('cambia con un período de unos 26 px: casi igual a 1 px, distinto a 26 px', () => {
    let cerca = 0;
    let lejos = 0;
    const n = 200;
    for (let i = 0; i < n; i++) {
      const s = i * 13.3;
      cerca += Math.abs(ruidoValor('b', s + 1) - ruidoValor('b', s));
      lejos += Math.abs(ruidoValor('b', s + 26) - ruidoValor('b', s));
    }
    expect(cerca / n).toBeLessThan(0.05);
    expect(lejos / n).toBeGreaterThan(0.15);
  });
});

describe('anchoVariable', () => {
  it('multiplica el ancho entre 0,55 y 1,45', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let s = 0; s < 3000; s += 2) {
      const w = anchoVariable('c', s);
      min = Math.min(min, w);
      max = Math.max(max, w);
    }
    expect(min).toBeGreaterThanOrEqual(0.55);
    expect(max).toBeLessThanOrEqual(1.45);
    expect(max - min).toBeGreaterThan(0.5);
  });
});

describe('recorrido', () => {
  it('mide el perímetro de un rectángulo redondeado', () => {
    const r = recorrido(rectRedondeado(0, 0, 200, 100, 0));
    expect(r.total).toBeCloseTo(600, 0);
    const redondo = recorrido(rectRedondeado(0, 0, 200, 100, 20));
    expect(redondo.total).toBeCloseTo(600 - 8 * 20 + 2 * Math.PI * 20, 0);
  });

  it('una curva de Bézier recta mide lo mismo que el segmento', () => {
    expect(recorrido(bezier([0, 0], [10, 0], [20, 0], [30, 0])).total).toBeCloseTo(30);
  });
});

describe('progreso y guion', () => {
  it('el trazo avanza de 0 a 1 en su duración', () => {
    expect(progresoDeTrazo(9, 10, 20)).toBe(0);
    expect(progresoDeTrazo(30, 10, 20)).toBe(1);
    const medio = progresoDeTrazo(20, 10, 20);
    expect(medio).toBeGreaterThan(0.3);
    expect(medio).toBeLessThan(0.7);
  });

  it('el desplazamiento del guion (stroke-dashoffset) va del largo total a 0', () => {
    expect(desplazamientoGuion(500, 0)).toBe(500);
    expect(desplazamientoGuion(500, 1)).toBe(0);
    expect(desplazamientoGuion(500, 0.25)).toBe(375);
  });

  it('la tinta es más tenue donde la pluma va rápido (al medio) que al empezar y terminar', () => {
    expect(opacidadPorVelocidad(0.5)).toBeLessThan(opacidadPorVelocidad(0.02));
    expect(opacidadPorVelocidad(0.5)).toBeLessThan(opacidadPorVelocidad(0.98));
    expect(opacidadPorVelocidad(0.5)).toBeGreaterThan(0.3);
  });
});

describe('segmentosDeTinta', () => {
  it('arma cuadriláteros contiguos con ancho variable y opacidad por velocidad', () => {
    const r = recorrido(bezier([0, 0], [100, 0], [200, 0], [300, 0]));
    const seg = segmentosDeTinta(r, { semilla: 'd', ancho: 8 });
    expect(seg.length).toBeGreaterThan(20);
    for (const s of seg) {
      expect(s.ancho).toBeGreaterThanOrEqual(8 * 0.55 - 1e-9);
      expect(s.ancho).toBeLessThanOrEqual(8 * 1.45 + 1e-9);
      expect(s.opacidad).toBeGreaterThan(0);
      expect(s.opacidad).toBeLessThanOrEqual(1);
    }
    expect(segmentosDeTinta(r, { semilla: 'd', ancho: 8 })).toEqual(seg);
  });
});
