import { expect, test } from 'vitest';
import type { Guion } from '../guion';
import { construirLinea, type Manifiesto } from '../tiempos';
import { CORTES, corteEntre, tramosDeSerie } from './serie';

const frase = (id: string) => ({ id, texto: id, hespo: { x: -220, pose: 'quieto' as const } });
const guion: Guion = {
  voz: 'v',
  escenas: [
    { id: 'queEs', frases: [frase('a')] },
    { id: 'lucia', frases: [frase('b'), frase('c')] },
    { id: 'logo', frases: [frase('d')] },
  ],
};
const manifiesto: Manifiesto = { voz: 'v', frases: Object.fromEntries(['a', 'b', 'c', 'd'].map((id) => [id, { archivo: id, duracion: 3, texto: id }])) };
const linea = construirLinea(guion, manifiesto);
const T = 18;
const total = linea.framesTotales + 90;
const tramos = tramosDeSerie(linea, total, T);

test('cada escena entra con la transición justo antes de su primera frase', () => {
  expect(tramos[0].desde).toBe(0);
  tramos.slice(1).forEach((t, i) => expect(t.desde).toBe(linea.escenas[i + 1].desde - T));
});

test('encadenadas como en una TransitionSeries: la siguiente empieza T cuadros antes del final de la anterior', () => {
  tramos.slice(1).forEach((t, i) => expect(t.desde).toBe(tramos[i].desde + tramos[i].duracion - T));
});

test('la última llega hasta el final del video, con la cola', () => {
  const ultimo = tramos[tramos.length - 1];
  expect(ultimo.desde + ultimo.duracion).toBe(total);
});

test('la serie dura lo mismo que el video', () => {
  const suma = tramos.reduce((s, t) => s + t.duracion, 0) - T * (tramos.length - 1);
  expect(suma).toBe(total);
});

test('cada corte tiene su transición; los no listados se funden', () => {
  expect(corteEntre('queEs', 'lucia')).toEqual(CORTES['queEs>lucia']);
  expect(corteEntre('lucia', 'logo')).toEqual({ tipo: 'fundido', destello: false });
});

test('los destellos cálidos van solo en 2 a 4 cortes clave', () => {
  const conDestello = Object.values(CORTES).filter((c) => c.destello);
  expect(conDestello.length).toBeGreaterThanOrEqual(2);
  expect(conDestello.length).toBeLessThanOrEqual(4);
});

test('ninguna transición desliza la imagen de lado a lado', () => {
  Object.values(CORTES).forEach((c) => expect(['fundido', 'cortina', 'iris']).toContain(c.tipo));
});
