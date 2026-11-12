import { expect, test } from 'vitest';
import { guion, POSES } from './guion';

const frases = guion.escenas.flatMap((e) => e.frases);

const TERMINOS_TECNICOS = [
  'PENDING_APPROVAL', 'IN_PROGRESS', 'RESOLVED', 'SUPERVISOR', 'COORDINADOR',
  'API', 'endpoint', 'CSV', 'backend', 'frontend',
];
const PROMESAS = [
  'notifica', 'sin conexión', 'aplicación móvil', 'inteligencia artificial',
  'se liga', 'se vincula', 'dar de baja', 'editar',
];

test('tiene las cinco escenas en orden y 37 frases', () => {
  expect(guion.escenas.map((e) => e.id)).toEqual(['inicio', 'especies', 'ejemplares', 'incidencias', 'cierre']);
  expect(frases).toHaveLength(37);
});

test('los identificadores son únicos', () => {
  expect(new Set(frases.map((f) => f.id)).size).toBe(37);
});

test('usa una voz peruana', () => {
  expect(guion.voz.startsWith('es-PE-')).toBe(true);
});

test('cada frase usa una pose existente', () => {
  frases.forEach((f) => expect(POSES).toContain(f.hespo.pose));
});

test('Hespo no pisa fuera del recorrido', () => {
  frases.forEach((f) => {
    expect(f.hespo.x).toBeGreaterThanOrEqual(-260);
    expect(f.hespo.x).toBeLessThanOrEqual(2180);
  });
});

test('cada movimiento queda dentro de la pantalla y usa una pose existente', () => {
  frases.flatMap((f) => [f.hespo, ...(f.hespo.luego ?? [])]).forEach((paso) => {
    expect(POSES).toContain(paso.pose);
    expect(paso.x).toBeGreaterThanOrEqual(-260);
    expect(paso.x).toBeLessThanOrEqual(2180);
    expect(paso.y ?? 880).toBeGreaterThanOrEqual(190);
    expect(paso.y ?? 880).toBeLessThanOrEqual(880);
  });
});

test('los movimientos de una frase van en orden', () => {
  frases.forEach((f) => {
    const momentos = (f.hespo.luego ?? []).map((p) => p.en);
    expect(momentos).toEqual([...momentos].sort((a, b) => a - b));
    momentos.forEach((m) => expect(m).toBeGreaterThan(f.hespo.espera ?? 0));
    momentos.forEach((m) => expect(m).toBeLessThan(1));
  });
});

test('no usa términos técnicos', () => {
  const texto = frases.map((f) => f.texto).join(' ');
  TERMINOS_TECNICOS.forEach((t) => expect(texto).not.toMatch(new RegExp(`\\b${t}\\b`)));
});

test('no promete funciones inexistentes', () => {
  const texto = frases.map((f) => f.texto).join(' ').toLowerCase();
  PROMESAS.forEach((p) => expect(texto).not.toContain(p));
});

test('presenta a Hespo', () => {
  expect(frases[0]).toMatchObject({ id: 'i1', texto: '¡Hola! Soy Hespo.' });
});
