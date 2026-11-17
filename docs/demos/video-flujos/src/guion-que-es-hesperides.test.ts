import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { guionQueEs } from './guion';
import { probarReglasComunes } from './reglasDeGuion';

probarReglasComunes('video ¿Qué es Hesperides?', guionQueEs);

const frases = guionQueEs.escenas.flatMap((e) => e.frases);
const texto = frases.map((f) => f.texto).join(' ');
const normalizar = (s: string) => s.replace(/\s+/g, ' ').trim();

test('diecisiete escenas en el orden del guion del usuario', () => {
  expect(guionQueEs.escenas.map((e) => e.id)).toEqual([
    'queEs', 'lucia', 'julio', 'campus', 'tuberia', 'bandeja', 'actividad', 'calendario', 'cuadrilla',
    'globo', 'observacion', 'historial', 'cierra', 'sano', 'futuro', 'juntos', 'logo',
  ]);
  expect(frases.map((f) => f.id)).toEqual(frases.map((_, i) => `q${i + 1}`));
});

test('la narración es la del usuario, palabra por palabra', () => {
  // guion.txt (raíz del repositorio en la copia del usuario) no está en git: se copia aquí la
  // narración tal cual, sin los títulos ni los bloques «En pantalla».
  const original = readFileSync(new URL('../guion-que-es-hesperides.narracion.txt', import.meta.url), 'utf-8');
  expect(normalizar(texto)).toBe(normalizar(original));
});

test('Hesperides se pronuncia Hespérides en todas las frases que lo nombran', () => {
  frases
    .filter((f) => f.texto.includes('Hesperides'))
    .forEach((f) => {
      expect(f.textoVoz).toBeDefined();
      expect(f.textoVoz).not.toContain('Hesperides');
      expect(f.textoVoz).toContain('Hespérides');
    });
});

test('«Excel» solo aparece donde el usuario lo escribió', () => {
  // Excepción pedida por el usuario: en pantalla se ven hojas de cálculo genéricas, sin su logo.
  expect(frases.filter((f) => /Excel/.test(f.texto)).map((f) => f.id)).toEqual(['q15']);
  expect(texto).not.toMatch(/WhatsApp|\b(24|48|72)\s?h/i);
});

test('no promete app móvil, modo sin conexión ni avisos por vencimiento', () => {
  expect(texto.toLowerCase()).not.toMatch(/app móvil|aplicación móvil|sin conexión|vencimiento|vence/);
});

test('dura cerca de 3:20: entre 520 y 600 palabras con la voz un poco más rápida', () => {
  const palabras = texto.split(/\s+/).filter(Boolean).length;
  expect(palabras).toBeGreaterThanOrEqual(520);
  expect(palabras).toBeLessThanOrEqual(600);
  expect(guionQueEs.velocidad).toBe('+15%');
});

test('Hespo solo brota en el cierre, con el logo', () => {
  guionQueEs.escenas
    .filter((e) => e.id !== 'logo')
    .flatMap((e) => e.frases)
    .forEach((f) => expect(f.hespo.x).toBe(-220));
  const logo = guionQueEs.escenas.find((e) => e.id === 'logo');
  expect(logo?.frases[0].hespo.x).toBeGreaterThan(0);
});
