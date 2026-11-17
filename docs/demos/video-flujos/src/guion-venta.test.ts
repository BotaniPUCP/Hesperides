import { expect, test } from 'vitest';
import { guionVenta } from './guion';
import { probarReglasComunes } from './reglasDeGuion';

probarReglasComunes('video de venta', guionVenta, ['inteligencia artificial']);

const frases = guionVenta.escenas.flatMap((e) => e.frases);
const porId = (id: string) => frases.find((f) => f.id === id)!;
const palabras = frases.map((f) => f.texto).join(' ').split(/\s+/).filter(Boolean).length;

test('tiene seis escenas en orden con las frases v1 a v10', () => {
  expect(guionVenta.escenas.map((e) => [e.id, e.frases.map((f) => f.id)])).toEqual([
    ['problema', ['v1', 'v2', 'v3']],
    ['presentacion', ['v4']],
    ['informacion', ['v5']],
    ['reporte', ['v6', 'v7']],
    ['seguimiento', ['v8', 'v9']],
    ['final', ['v10']],
  ]);
});

test('cabe entre 70 y 85 segundos: de 140 a 170 palabras', () => {
  expect(palabras).toBeGreaterThanOrEqual(140);
  expect(palabras).toBeLessThanOrEqual(170);
});

test('solo v6 menciona la inteligencia artificial', () => {
  expect(porId('v6').texto).toContain('inteligencia artificial');
  frases.filter((f) => f.id !== 'v6').forEach((f) => expect(f.texto).not.toContain('inteligencia artificial'));
});

test('no promete plazos que el cliente no confirmó', () => {
  frases.forEach((f) => expect(f.texto).not.toMatch(/\b(24|48|72)\b/));
});

test('el nombre del sistema se pronuncia Hespérides', () => {
  ['v4', 'v10'].forEach((id) => expect(porId(id).textoVoz).toContain('Hespérides'));
});

test('usa la voz de los videos anteriores', () => {
  expect(guionVenta.voz).toBe('es-PE-CamilaNeural');
});
