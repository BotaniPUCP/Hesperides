import { buildLookTable } from '../lookTable';
import type { BuildingLook, Region, Zone } from '../types';

const vidrio: Region = { material: 'vidrio', u: [-6, 5], v: [0, 13] };

const look = (zones: Zone[], planKey = 'k1'): BuildingLook => ({
  planKey, name: 'Uno', folder: 'uno', photos: ['frente.jpg'],
  materials: {
    blanco: { color: '#ffffff' }, otroBlanco: { color: '#ffffff' }, gris: { color: '#808080' },
    vidrio: { glass: '#2e3437', frame: '#e4e4df', moduleM: 1.25, heightM: 3.9 },
  },
  zones,
});
const zone = (faces: Zone['faces'], over: Partial<Zone> = {}): Zone => ({ id: 'base', wall: 'blanco', roof: 'gris', faces, ...over });

describe('buildLookTable', () => {
  it('sin fichas, la tabla igual existe para que la textura tenga tamaño', () => {
    const table = buildLookTable([]);
    expect(table.height).toBeGreaterThanOrEqual(1);
    expect(table.data.length).toBe(table.width * table.height * 4);
  });

  it('guarda las zonas de cada edificio en el orden de la ficha, con su selector', () => {
    const where = { east: [0.5, 1] as [number, number] };
    const table = buildLookTable([look([zone({ N: [vidrio] }), zone({ N: [vidrio] }, { id: 'este', where })])]);
    expect(table.zones.get('k1')!.map((z) => z.where)).toEqual([undefined, where]);
  });

  it('una cara copiada no repite la lista de regiones', () => {
    const alone = buildLookTable([look([zone({ N: [vidrio] })])]);
    const copied = buildLookTable([look([zone({ N: [vidrio], S: { sameAs: 'N', why: 'simétrico' } })])]);
    expect(copied.texels).toBe(alone.texels);
  });

  it('dos materiales con el mismo color se guardan una vez', () => {
    const base = look([zone({ N: [{ material: 'blanco', v: [0, 1] }] })]);
    const withoutTwin = Object.fromEntries(Object.entries(base.materials).filter(([name]) => name !== 'otroBlanco'));
    const one = buildLookTable([{ ...base, materials: withoutTwin }]);
    const two = buildLookTable([look([zone({ N: [{ material: 'otroBlanco', v: [0, 1] }] })])]);
    expect(two.texels).toBe(one.texels);
  });

  it('todo lo que lee el shader es un número finito, aun en tramos sin límite', () => {
    const table = buildLookTable([look([zone({ N: [{ material: 'vidrio' }] }, { common: [{ material: 'gris', floors: { everyM: 3.9, bandM: [0, 0.4] } }] })])]);
    expect(table.data.every(Number.isFinite)).toBe(true);
  });
});
