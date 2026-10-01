import type { ZoneProperties } from '@shared/types';
import { MODES, categoryOf, colorOf } from '../modes';

function section(extra: Partial<ZoneProperties> = {}): ZoneProperties {
  return {
    code: 'AV-0001', name: 'Jardín', description: null, parentCode: 'SEC-VERDE-02', mapCode: 'C 1',
    useType: 'Áreas de uso recreativo/descanso', reservable: false, reservationOwner: null, areaM2: 350,
    landscapeType: 'GREEN_AREA', irrigationCurrent: 'Riego por aspersión', irrigationProject: 'Goteo', ...extra,
  };
}

describe('modos de color de las áreas verdes', () => {
  it('ofrece los seis modos del prototipo, con «Sector» en lugar de «Jefe»', () => {
    // El sector es territorio, no persona (SPEC-005 §4.4): no hay modo por capataz.
    expect(Object.values(MODES).map((m) => m.label)).toEqual(['General', 'Uso', 'Riego', 'Proyecto', 'Tamaño', 'Sector']);
  });

  it('clasifica por el campo que corresponde a cada modo', () => {
    const s = section();
    expect(categoryOf(s, 'base')).toBe('base');
    expect(categoryOf(s, 'uso')).toBe('Áreas de uso recreativo/descanso');
    expect(categoryOf(s, 'riego')).toBe('Riego por aspersión');
    expect(categoryOf(s, 'proyecto')).toBe('Goteo');
    expect(categoryOf(s, 'sector')).toBe('SEC-VERDE-02');
  });

  it('agrupa el tamaño en los cinco rangos del prototipo', () => {
    expect(categoryOf(section({ areaM2: 50 }), 'tamano')).toBe('a');
    expect(categoryOf(section({ areaM2: 350 }), 'tamano')).toBe('b');
    expect(categoryOf(section({ areaM2: 1999 }), 'tamano')).toBe('c');
    expect(categoryOf(section({ areaM2: 4000 }), 'tamano')).toBe('d');
    expect(categoryOf(section({ areaM2: 12000 }), 'tamano')).toBe('e');
  });

  it('una sección sin sector cae en «Sin sector», no desaparece', () => {
    expect(categoryOf(section({ parentCode: null }), 'sector')).toBe('');
    expect(MODES.sector.cats.find((c) => c.key === '')?.label).toBe('Sin sector');
  });

  it('un valor que el modo no conoce recibe el color de respaldo', () => {
    expect(colorOf(section({ useType: 'Valor nuevo' }), 'uso')).toBe('#60E880');
  });
});
