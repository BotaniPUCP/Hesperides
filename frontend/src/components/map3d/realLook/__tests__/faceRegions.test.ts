import { faceRegions } from '../faceRegions';
import type { Region, Zone } from '../types';

const zocalo: Region = { material: 'zocalo', v: [-1, 0.45] };
const vidrio: Region = { material: 'vidrio', u: [-6, 5], v: [0, 13] };
const franja: Region = { material: 'melon', v: [1, 2] };

const zone = (faces: Zone['faces'], common: Region[] = [zocalo]): Zone => ({ id: 'z', wall: 'blanco', roof: 'techo', common, faces });

describe('faceRegions', () => {
  it('pinta primero las regiones comunes y encima las de la cara, en su orden', () => {
    expect(faceRegions(zone({ N: [vidrio, franja] }), 'N')).toEqual([zocalo, vidrio, franja]);
  });

  it('una orientación sin entrada lleva solo las regiones comunes', () => {
    expect(faceRegions(zone({ N: [vidrio] }), 'S')).toEqual([zocalo]);
    expect(faceRegions(zone(undefined, []), 'S')).toEqual([]);
  });

  it('una copia toma las regiones de la otra cara tal cual', () => {
    expect(faceRegions(zone({ N: [vidrio], S: { sameAs: 'N', why: 'simétrico' } }), 'S')).toEqual([zocalo, vidrio]);
  });

  it('una copia en espejo invierte el tramo de u y deja igual lo que no lo tiene', () => {
    const copy = faceRegions(zone({ N: [vidrio, franja], S: { sameAs: 'N', mirror: true, why: 'barra gemela' } }), 'S');
    expect(copy).toEqual([zocalo, { ...vidrio, u: [-5, 6] }, franja]);
  });

  it('una copia de una copia se resuelve, y dos espejos se anulan', () => {
    const faces: Zone['faces'] = { N: [vidrio], S: { sameAs: 'N', mirror: true, why: 'a' }, E: { sameAs: 'S', mirror: true, why: 'b' } };
    expect(faceRegions(zone(faces), 'E')).toEqual([zocalo, vidrio]);
  });
});
