import { expect, test } from 'vitest';
import { guionPlanificacion } from './guion';
import { probarReglasComunes } from './reglasDeGuion';

probarReglasComunes('segundo video', guionPlanificacion);

const frases = guionPlanificacion.escenas.flatMap((e) => e.frases);
const texto = frases.map((f) => f.texto).join(' ');

test('tiene las cinco escenas en orden y 39 frases', () => {
  expect(guionPlanificacion.escenas.map((e) => e.id)).toEqual(['inicio', 'frecuencias', 'planificacion', 'reservas', 'cierre']);
  expect(frases.map((f) => f.id)).toEqual([
    'i1', 'i2', 'i3', 'i4', 'i5', 'f1', 'f2', 'f3', 'f4', 'f5',
    'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13',
    'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6',
  ]);
});

test('usa la voz del primer video', () => {
  expect(guionPlanificacion.voz).toBe('es-PE-CamilaNeural');
});

test('presenta a Hespo de nuevo', () => {
  expect(frases[0]).toMatchObject({ id: 'i1', texto: '¡Hola de nuevo! Soy Hespo.' });
});

test('no usa las palabras que la web evita', () => {
  ['ronda', 'ritmo', 'alcance', 'scope', 'OVERDUE', 'DUE', 'SCHEDULED'].forEach((t) =>
    expect(texto).not.toMatch(new RegExp(`\\b${t}\\b`, 'i')),
  );
});

test('no afirma lo que el sistema no hace', () => {
  ['correo', 'notifica', 'calendario de la OSG', 'se repite', 'automáticamente', 'aplicación móvil', 'evento bloqueante'].forEach(
    (p) => expect(texto.toLowerCase()).not.toContain(p.toLowerCase()),
  );
});

test('solo r10 habla de impedir, y para negarlo', () => {
  expect(frases.filter((f) => /impide/i.test(f.texto)).map((f) => f.id)).toEqual(['r10']);
  expect(frases.find((f) => f.id === 'r10')!.texto.startsWith('Ningún aviso impide')).toBe(true);
});

test('pronuncia Hespérides', () => {
  const conNombre = frases.filter((f) => f.texto.includes('Hesperides'));
  expect(conNombre.length).toBeGreaterThan(0);
  conNombre.forEach((f) => expect(f.textoVoz).toContain('Hespérides'));
});
