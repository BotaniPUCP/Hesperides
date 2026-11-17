import { describe, expect, test } from 'vitest';
import type { Guion } from '../guion';
import { construirLinea, type Manifiesto } from '../tiempos';
import { CUADROS_TRANSICION_QUE_ES, momentoEn, MOMENTOS, pistasDeSonido } from './momentos';

const frase = (id: string) => ({ id, texto: id, hespo: { x: -220, pose: 'quieto' as const } });
const guion: Guion = {
  voz: 'es-PE-CamilaNeural',
  escenas: [
    { id: 'queEs', frases: [frase('q1')] },
    { id: 'campus', frases: [frase('q15')] },
    { id: 'tuberia', frases: [frase('q19')] },
    { id: 'bandeja', frases: [frase('q22')] },
    { id: 'globo', frases: [frase('q32')] },
    { id: 'cierra', frases: [frase('q37'), frase('q38')] },
    { id: 'logo', frases: [frase('q48')] },
  ],
};
const manifiesto: Manifiesto = {
  voz: 'es-PE-CamilaNeural',
  frases: Object.fromEntries(['q1', 'q15', 'q19', 'q22', 'q32', 'q37', 'q38', 'q48'].map((id) => [id, { archivo: `${id}.mp3`, duracion: 4, texto: id }])),
};
const linea = construirLinea(guion, manifiesto);

describe('momentos clave compartidos por las escenas y los sonidos', () => {
  test('cada momento es una fracción de su frase', () => {
    const q22 = linea.escenas[3].frases[0];
    expect(momentoEn(linea, MOMENTOS.aprobar)).toBe(q22.desde + Math.round(0.32 * q22.frames));
  });

  test('una frase que no existe se avisa', () => {
    expect(() => momentoEn(linea, ['q99', 0.5])).toThrow('q99');
  });
});

describe('pistas de sonido', () => {
  const pistas = pistasDeSonido(linea);
  const de = (s: string) => pistas.filter((p) => p.sonido === s);

  test('un barrido suave en cada cambio de escena, durante la transición', () => {
    expect(de('barrido')).toHaveLength(linea.escenas.length - 1);
    de('barrido').forEach((p, i) => {
      const siguiente = linea.escenas[i + 1];
      expect(p.frame).toBeGreaterThanOrEqual(siguiente.desde - CUADROS_TRANSICION_QUE_ES);
      expect(p.frame).toBeLessThan(siguiente.desde);
    });
  });

  test('clic al aprobar, al enviar y al cerrar; golpe en el sello; pop y campanita en el globo', () => {
    expect(de('clic').map((p) => p.frame)).toEqual(
      [momentoEn(linea, MOMENTOS.enviar), momentoEn(linea, MOMENTOS.aprobar), momentoEn(linea, MOMENTOS.sello) - 5].sort((a, b) => a - b),
    );
    expect(de('golpe').map((p) => p.frame)).toEqual([momentoEn(linea, MOMENTOS.sello)]);
    expect(de('pop').map((p) => p.frame)).toContain(momentoEn(linea, MOMENTOS.globoAparece));
    expect(de('campanita').map((p) => p.frame)).toContain(momentoEn(linea, MOMENTOS.globoAparece) + 2);
  });

  test('papel por cada hoja de cálculo que cae', () => {
    expect(de('papel')).toHaveLength(5);
  });

  test('van en orden, dentro del video y más bajo cuando habla la voz', () => {
    expect(pistas.map((p) => p.frame)).toEqual([...pistas.map((p) => p.frame)].sort((a, b) => a - b));
    pistas.forEach((p) => {
      expect(p.frame).toBeGreaterThanOrEqual(0);
      expect(p.frame).toBeLessThan(linea.framesTotales + 90);
      expect(p.volumen).toBeGreaterThan(0);
      expect(p.volumen).toBeLessThanOrEqual(0.5);
    });
    const golpe = de('golpe')[0];
    // El sello cae mientras habla la voz: suena más bajo que su volumen base.
    expect(golpe.volumen).toBeLessThan(0.5);
  });
});
