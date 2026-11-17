import { expect, test } from 'vitest';
import { guionHistoria } from './guion';
import { probarReglasComunes } from './reglasDeGuion';

probarReglasComunes('video de historia', guionHistoria, ['inteligencia artificial']);

const frases = guionHistoria.escenas.flatMap((e) => e.frases);
const texto = frases.map((f) => f.texto).join(' ');

test('cinco escenas con las frases h1 a h12', () => {
  expect(guionHistoria.escenas.map((e) => [e.id, e.frases.map((f) => f.id)])).toEqual([
    ['manana', ['h1', 'h2']],
    ['hoy', ['h3', 'h4', 'h5']],
    ['aparece', ['h6']],
    ['solucion', ['h7', 'h8', 'h9', 'h10']],
    ['resultado', ['h11', 'h12']],
  ]);
});

test('cabe en 80 a 100 segundos: de 150 a 200 palabras más 8 a 16 s de respiros', () => {
  const palabras = texto.split(/\s+/).filter(Boolean).length;
  const respiros = frases.reduce((s, f) => s + (f.respiro ?? 0), 0);
  expect(palabras).toBeGreaterThanOrEqual(150);
  expect(palabras).toBeLessThanOrEqual(200);
  expect(respiros).toBeGreaterThanOrEqual(8);
  expect(respiros).toBeLessThanOrEqual(16);
});

test('no nombra marcas de terceros ni promete plazos', () => {
  expect(texto).not.toMatch(/WhatsApp|Excel|\b(24|48|72)\b/i);
});

test('Hespo no aparece antes de presentarse', () => {
  guionHistoria.escenas
    .filter((e) => e.id === 'manana' || e.id === 'hoy')
    .flatMap((e) => e.frases)
    .forEach((f) => expect(f.hespo.x).toBe(-220));
});

test('el nombre se pronuncia Hespérides', () => {
  expect(frases.find((f) => f.id === 'h12')?.textoVoz).toContain('Hespérides');
});
