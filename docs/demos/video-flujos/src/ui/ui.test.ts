import { expect, test } from 'vitest';
import { guion, type Frase } from '../guion';
import type { TramoEscena } from '../tiempos';
import { apareceEn, capturaEn, escrito, indiceFrase, momentoDe, progresoEntre, pulsoDesde } from './anim';
import { partirEnLineas } from './lineas';

const frase = (id: string): Frase => ({ id, texto: id, hespo: { x: 0, pose: 'quieto' } });

const escena: TramoEscena = {
  id: 'inicio',
  desde: 100,
  frames: 208,
  frases: [
    { frase: frase('a'), escenaId: 'inicio', desde: 100, frames: 100, archivo: 'a.mp3' },
    { frase: frase('b'), escenaId: 'inicio', desde: 208, frames: 100, archivo: 'b.mp3' },
  ],
};

test('la frase más larga cabe en dos líneas', () => {
  guion.escenas.flatMap((e) => e.frases).forEach((f) => {
    const lineas = partirEnLineas(f.texto);
    expect(lineas.length).toBeLessThanOrEqual(2);
    lineas.forEach((l) => expect(l.length).toBeLessThanOrEqual(85));
    expect(lineas.join(' ')).toBe(f.texto);
  });
});

test('una frase corta queda en una línea', () => {
  expect(partirEnLineas('Así de simple.')).toEqual(['Así de simple.']);
});

test('reparte las dos líneas de forma pareja', () => {
  const [primera, segunda] = partirEnLineas('palabra '.repeat(20).trim());

  expect(Math.abs(primera.length - segunda.length)).toBeLessThanOrEqual(8);
});

test('apareceEn vale 0 antes de la frase y 1 al terminar', () => {
  expect(apareceEn(escena, 'b', 207)).toBe(0);
  expect(apareceEn(escena, 'b', 220)).toBe(1);
  expect(apareceEn(escena, 'b', 214)).toBeGreaterThan(0);
  expect(apareceEn(escena, 'b', 214)).toBeLessThan(1);
});

test('el retraso desplaza la aparición dentro de la frase', () => {
  expect(apareceEn(escena, 'a', 149, 0.5)).toBe(0);
  expect(apareceEn(escena, 'a', 162, 0.5)).toBe(1);
});

test('apareceEn falla con una frase de otra escena', () => {
  expect(() => apareceEn(escena, 'z', 100)).toThrow(/z/);
});

test('indiceFrase da la última frase iniciada, también en la pausa', () => {
  expect(indiceFrase(escena, 99)).toBe(-1);
  expect(indiceFrase(escena, 100)).toBe(0);
  expect(indiceFrase(escena, 205)).toBe(0);
  expect(indiceFrase(escena, 208)).toBe(1);
});

test('progresoEntre avanza de forma lineal dentro de una parte de la frase', () => {
  expect(progresoEntre(escena, 'a', 110, 0.2, 0.6)).toBe(0);
  expect(progresoEntre(escena, 'a', 140, 0.2, 0.6)).toBe(0.5);
  expect(progresoEntre(escena, 'a', 190, 0.2, 0.6)).toBe(1);
});

test('escrito muestra el texto letra por letra', () => {
  expect(escrito('palmera', 0)).toBe('');
  expect(escrito('palmera', 0.5)).toBe('pal');
  expect(escrito('palmera', 1)).toBe('palmera');
});

test('pulsoDesde nace en el aterrizaje y termina', () => {
  expect(pulsoDesde(99, 100)).toBe(0);
  expect(pulsoDesde(109, 100)).toBe(0.5);
  expect(pulsoDesde(118, 100)).toBe(1);
});

test('momentoDe convierte una fracción de la frase en un fotograma', () => {
  expect(momentoDe(escena, 'b')).toBe(208);
  expect(momentoDe(escena, 'b', 0.5)).toBe(258);
});

test('capturaEn da la última captura ya alcanzada', () => {
  const agenda: [number, string][] = [[0, 'a'], [10, 'b'], [20, 'c']];

  expect(capturaEn(agenda, 0)).toBe('a');
  expect(capturaEn(agenda, 9)).toBe('a');
  expect(capturaEn(agenda, 10)).toBe('b');
  expect(capturaEn(agenda, 500)).toBe('c');
});

test('capturaEn falla si la agenda no va en orden', () => {
  expect(() => capturaEn([[10, 'a'], [5, 'b']], 7)).toThrow(/orden/);
});
