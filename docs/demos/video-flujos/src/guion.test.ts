import { expect, test } from 'vitest';
import { guion } from './guion';
import { probarReglasComunes } from './reglasDeGuion';

const frases = guion.escenas.flatMap((e) => e.frases);

probarReglasComunes('primer video', guion);

test('tiene las cinco escenas en orden y 37 frases', () => {
  expect(guion.escenas.map((e) => e.id)).toEqual(['inicio', 'especies', 'ejemplares', 'incidencias', 'cierre']);
  expect(frases).toHaveLength(37);
});

test('presenta a Hespo', () => {
  expect(frases[0]).toMatchObject({ id: 'i1', texto: '¡Hola! Soy Hespo.' });
});
