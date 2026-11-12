import { describe, expect, test } from 'vitest';
import { POSES, type Guion } from './guion';

const TERMINOS_TECNICOS = [
  'PENDING_APPROVAL', 'IN_PROGRESS', 'RESOLVED', 'SUPERVISOR', 'COORDINADOR',
  'API', 'endpoint', 'CSV', 'backend', 'frontend',
];
const PROMESAS = [
  'notifica', 'sin conexión', 'aplicación móvil', 'inteligencia artificial',
  'se liga', 'se vincula', 'dar de baja', 'editar',
];

/** Las reglas que valen para cualquier guion de Hespo. */
export function probarReglasComunes(nombre: string, guion: Guion): void {
  const frases = guion.escenas.flatMap((e) => e.frases);

  describe(`reglas comunes del ${nombre}`, () => {
    test('los identificadores son únicos', () => {
      expect(new Set(frases.map((f) => f.id)).size).toBe(frases.length);
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
  });
}
