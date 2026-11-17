import { describe, expect, it } from 'vitest';
import { guionHistoria } from '../guion';
import { construirLinea, fraseActiva, type Manifiesto } from '../tiempos';
import { EFECTOS, efectosDeHistoria, volumenEfecto } from './efectos';
import { golpesDeHistoria } from './impacto';

const manifiesto: Manifiesto = {
  voz: guionHistoria.voz,
  frases: Object.fromEntries(guionHistoria.escenas.flatMap((e) => e.frases).map((f) => [f.id, { archivo: `${f.id}.mp3`, duracion: 4, texto: f.textoVoz ?? f.texto }])),
};
const linea = construirLinea(guionHistoria, manifiesto);
const efectos = efectosDeHistoria(linea);

describe('efectos de la historia', () => {
  it('usan solo los efectos sintetizados y van en orden dentro del video', () => {
    for (const e of efectos) {
      expect(EFECTOS).toContain(e.efecto);
      expect(e.frame).toBeGreaterThanOrEqual(0);
      expect(e.frame).toBeLessThan(linea.framesTotales);
    }
    const frames = efectos.map((e) => e.frame);
    expect(frames).toEqual([...frames].sort((a, b) => a - b));
  });

  it('un whoosh por cambio de escena, y los golpes suenan', () => {
    expect(efectos.filter((e) => e.efecto === 'whoosh')).toHaveLength(linea.escenas.length - 1);
    const golpes = golpesDeHistoria(linea);
    const cerca = (efecto: string, id: string) => efectos.some((e) => e.efecto === efecto && Math.abs(e.frame - golpes.find((g) => g.id === id)!.frame) <= 12);
    expect(cerca('crujido', 'grieta')).toBe(true);
    expect(cerca('pop', 'brote')).toBe(true);
    expect(cerca('ding', 'mapa')).toBe(true);
    expect(cerca('sello', 'sello')).toBe(true);
    expect(cerca('crujido', 'caida')).toBe(true);
    expect(efectos.filter((e) => e.efecto === 'clic').length).toBeGreaterThanOrEqual(2);
  });

  it('son sutiles: volumen base ≤ 0,8 y más bajo mientras habla la voz', () => {
    for (const e of efectos) expect(e.volumen).toBeLessThanOrEqual(0.8);
    const conVoz = linea.escenas[0].frases[0].desde + 10;
    expect(fraseActiva(linea, conVoz)).not.toBeNull();
    const sinVoz = linea.escenas[0].frases[0].desde + linea.escenas[0].frases[0].frames + 2;
    expect(volumenEfecto(linea, conVoz, 0.6)).toBeLessThan(volumenEfecto(linea, sinVoz, 0.6));
  });
});
