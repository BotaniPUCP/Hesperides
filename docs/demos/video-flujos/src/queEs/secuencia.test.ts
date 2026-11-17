import { describe, expect, test } from 'vitest';
import { centroDeGlobo, posicionEnSecuencia, rutaCuadro } from './secuencia';

describe('posición dentro de una secuencia de capturas', () => {
  test('al empezar es el primer cuadro, sin mezcla', () => {
    expect(posicionEnSecuencia(100, 100, 300)).toEqual({ a: 0, b: 1, mezcla: 0 });
  });

  test('a medio ritmo mezcla dos capturas vecinas', () => {
    expect(posicionEnSecuencia(103, 100, 300, 0.5)).toEqual({ a: 1, b: 2, mezcla: 0.5 });
  });

  test('puede empezar más adelante en la secuencia', () => {
    expect(posicionEnSecuencia(100, 100, 300, 1, 40).a).toBe(40);
  });

  test('no sale de la secuencia: se queda en la última o la primera', () => {
    expect(posicionEnSecuencia(1000, 100, 300)).toEqual({ a: 299, b: 299, mezcla: 0 });
    expect(posicionEnSecuencia(50, 100, 300)).toEqual({ a: 0, b: 1, mezcla: 0 });
  });

  test('al revés recorre la secuencia hacia atrás', () => {
    expect(posicionEnSecuencia(110, 100, 300, -1, 200).a).toBe(190);
  });
});

test('ruta de cada captura con tres cifras', () => {
  expect(rutaCuadro('globo', 7)).toBe('capturas/que-es/globo/007.jpg');
});

describe('dónde está el globo', () => {
  const cajas = [
    [{ x: 100, y: 200, ancho: 120, alto: 120 }],
    [{ x: 120, y: 220, ancho: 120, alto: 120 }],
  ];

  test('el centro del globo en la captura', () => {
    expect(centroDeGlobo(cajas, { a: 0, b: 1, mezcla: 0 })).toEqual({ x: 160, y: 260 });
  });

  test('entre dos capturas, el centro se interpola', () => {
    expect(centroDeGlobo(cajas, { a: 0, b: 1, mezcla: 0.5 })).toEqual({ x: 170, y: 270 });
  });

  test('sin medidas o fuera de cuadro no hay globo', () => {
    expect(centroDeGlobo([], { a: 0, b: 0, mezcla: 0 })).toBeNull();
    expect(centroDeGlobo([[{ x: 100, y: -300, ancho: 120, alto: 120 }]], { a: 0, b: 0, mezcla: 0 })).toBeNull();
  });
});
