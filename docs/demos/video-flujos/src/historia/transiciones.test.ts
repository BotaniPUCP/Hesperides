import { describe, expect, it } from 'vitest';
import { guionHistoria } from '../guion';
import { construirLinea, FRAMES_TRANSICION, type Manifiesto } from '../tiempos';
import { CORTES_HISTORIA, secuenciasConTransicion } from './transiciones';

const manifiesto: Manifiesto = {
  voz: guionHistoria.voz,
  frases: Object.fromEntries(guionHistoria.escenas.flatMap((e) => e.frases).map((f) => [f.id, { archivo: `${f.id}.mp3`, duracion: 4, texto: f.textoVoz ?? f.texto }])),
};
const linea = construirLinea(guionHistoria, manifiesto);
const total = linea.framesTotales + 90;
const T = FRAMES_TRANSICION;
const secuencias = secuenciasConTransicion(linea, total, T);

describe('secuenciasConTransicion', () => {
  it('una secuencia por escena, en orden', () => {
    expect(secuencias.map((s) => s.escena.id)).toEqual(linea.escenas.map((e) => e.id));
  });

  it('cada transición ocupa el respiro silencioso antes de la escena: la voz no se corre', () => {
    for (let i = 1; i < secuencias.length; i++) {
      // Así arma TransitionSeries las secuencias: la siguiente empieza T cuadros antes del fin.
      expect(secuencias[i].desde).toBe(secuencias[i - 1].desde + secuencias[i - 1].duracion - T);
      expect(secuencias[i].desde + T).toBe(linea.escenas[i].desde);
      // Y en ese tramo ya terminó la última frase de la escena anterior.
      const anterior = linea.escenas[i - 1];
      expect(secuencias[i].desde).toBeGreaterThanOrEqual(anterior.desde + anterior.frames);
    }
  });

  it('la serie dura lo mismo que el video', () => {
    const suma = secuencias.reduce((s, x) => s + x.duracion, 0) - (secuencias.length - 1) * T;
    expect(suma).toBe(total);
    expect(secuencias[0].desde).toBe(0);
  });
});

describe('cortes de la historia', () => {
  it('un corte por cambio de escena, sin deslizamientos laterales, y luz cálida en 2 a 4', () => {
    expect(CORTES_HISTORIA).toHaveLength(linea.escenas.length - 1);
    for (const c of CORTES_HISTORIA) expect(['fade', 'wipe', 'iris']).toContain(c.tipo);
    const luces = CORTES_HISTORIA.filter((c) => c.luz).length;
    expect(luces).toBeGreaterThanOrEqual(2);
    expect(luces).toBeLessThanOrEqual(4);
  });
});
