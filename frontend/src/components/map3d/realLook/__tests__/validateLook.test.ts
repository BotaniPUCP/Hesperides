import { LookError, validateLooks } from '../validateLook';
import type { BuildingLook, Region, Zone } from '../types';

const keys = new Set(['k1']);

const baseZone: Zone = {
  id: 'base', wall: 'ladrillo', roof: 'concreto',
  common: [{ material: 'concreto', floors: { everyM: 3.9, bandM: [-0.3, 0.45] } }],
  faces: {
    W: [{ material: 'vidrio', u: [-6, 5], v: [0, 13] }],
    E: { sameAs: 'W', mirror: true, why: 'barra gemela' },
  },
};

const look = (over: Partial<BuildingLook> = {}): BuildingLook => ({
  planKey: 'k1', name: 'Uno', folder: 'uno', photos: ['frente.jpg'],
  materials: {
    ladrillo: { color: '#c47a65' },
    concreto: { color: '#b8b3ab' },
    vidrio: { glass: '#2e3437', frame: '#e4e4df', moduleM: 1.25, heightM: 3.9 },
  },
  zones: [baseZone],
  ...over,
});

const withZone = (zone: Partial<Zone>) => look({ zones: [{ ...baseZone, ...zone }] });
const check = (looks: BuildingLook[]) => () => validateLooks(looks, keys);
const regions = (n: number): Region[] => Array.from({ length: n }, (_, i) => ({ material: 'vidrio', u: [i * 2, i * 2 + 1] as [number, number] }));

describe('validateLooks: fichas', () => {
  it('acepta una ficha bien formada', () => {
    expect(check([look()])).not.toThrow();
  });

  it('falla si el plan_key no está en el modelo', () => {
    expect(() => validateLooks([look()], new Set(['otro']))).toThrow(LookError);
    expect(() => validateLooks([look()], new Set(['otro']))).toThrow(/no está en el modelo/);
  });

  it('falla con dos fichas del mismo plan_key', () => {
    expect(check([look(), look()])).toThrow(/repetida/);
  });

  it('falla si no cita fotos ni otra fuente', () => {
    expect(check([look({ folder: undefined, photos: undefined })])).toThrow(/fotos/);
    expect(check([look({ folder: undefined, photos: undefined, source: 'frontend/scripts/pabellon-n-appearance.mjs' })])).not.toThrow();
  });
});

describe('validateLooks: materiales', () => {
  it('falla con un color que no es hexadecimal y dice de qué material', () => {
    expect(check([look({ materials: { ...look().materials, ladrillo: { color: 'rojo' } } })])).toThrow(/material ladrillo.*color/);
  });

  it('falla con un módulo de vidrio fuera de los rangos de un edificio', () => {
    const vidrio = { glass: '#2e3437', frame: '#e4e4df', moduleM: 0.2, heightM: 3.9 };
    expect(check([look({ materials: { ...look().materials, vidrio } })])).toThrow(/módulo/);
    expect(check([look({ materials: { ...look().materials, vidrio: { ...vidrio, moduleM: 1.2, heightM: 9 } } })])).toThrow(/módulo/);
  });

  it('falla si el antepecho no cabe en el módulo', () => {
    const vidrio = { glass: '#2e3437', frame: '#e4e4df', moduleM: 1.2, heightM: 3.6, spandrel: { color: '#cbd0cc', heightM: 3.6 } };
    expect(check([look({ materials: { ...look().materials, vidrio } })])).toThrow(/antepecho/);
  });

  it('falla con perfiles o variación de tono fuera de rango', () => {
    const vidrio = { glass: '#2e3437', frame: '#e4e4df', moduleM: 1.2, heightM: 3.6 };
    expect(check([look({ materials: { ...look().materials, vidrio: { ...vidrio, frameM: 0.5 } } })])).toThrow(/perfiles/);
    expect(check([look({ materials: { ...look().materials, vidrio: { ...vidrio, vary: 0.4 } } })])).toThrow(/tono/);
  });

  it('falla con un acento de proporción imposible', () => {
    const vidrio = { glass: '#2e3437', frame: '#e4e4df', moduleM: 1.2, heightM: 3.6, accent: { color: '#24608b', share: 1.5 } };
    expect(check([look({ materials: { ...look().materials, vidrio } })])).toThrow(/acento/);
  });
});

describe('validateLooks: regiones', () => {
  it('falla si una región cita un material inexistente, y dice la zona y la cara', () => {
    expect(check([withZone({ faces: { W: [{ material: 'piedra' }] } })])).toThrow(/zona base, cara W.*piedra/);
  });

  it('falla con tramos de u o de v al revés', () => {
    expect(check([withZone({ faces: { W: [{ material: 'vidrio', u: [5, -6] }] } })])).toThrow(/tramo de u/);
    expect(check([withZone({ faces: { W: [{ material: 'vidrio', v: [13, 0] }] } })])).toThrow(/tramo de v/);
  });

  it('falla con una franja por piso de menos de 4 m de ancho', () => {
    const narrow: Region = { material: 'concreto', u: [0, 3], floors: { everyM: 3.9, bandM: [0, 0.4] } };
    expect(check([withZone({ common: [narrow] })])).toThrow(/4 m/);
    expect(check([withZone({ common: [{ ...narrow, u: [0, 4] }] })])).not.toThrow();
  });

  it('falla con una franja que no cabe en su piso o con un piso fuera de rango', () => {
    expect(check([withZone({ common: [{ material: 'concreto', floors: { everyM: 3.9, bandM: [0, 4] } }] })])).toThrow(/piso/);
    expect(check([withZone({ common: [{ material: 'concreto', floors: { everyM: 1, bandM: [0, 0.4] } }] })])).toThrow(/piso/);
  });

  it('acepta 12 regiones en una cara contando las comunes, y falla con 13', () => {
    expect(check([withZone({ faces: { W: regions(11) } })])).not.toThrow();
    expect(check([withZone({ faces: { W: regions(12) } })])).toThrow(/12/);
  });
});

describe('validateLooks: zonas y caras', () => {
  it('falla si una cara copia a otra que no tiene regiones propias', () => {
    expect(check([withZone({ faces: { E: { sameAs: 'N', why: 'gemela' } } })])).toThrow(/cara E.*N/);
  });

  it('falla con una copia circular', () => {
    expect(check([withZone({ faces: { E: { sameAs: 'W', why: 'x' }, W: { sameAs: 'E', why: 'x' } } })])).toThrow(/circular/);
  });

  it('falla si una copia no dice por qué', () => {
    expect(check([withZone({ faces: { W: [{ material: 'vidrio' }], E: { sameAs: 'W', why: ' ' } } })])).toThrow(/por qué/);
  });

  it('falla si el muro cita un material inexistente', () => {
    expect(check([withZone({ wall: 'piedra' })])).toThrow(/muro/);
  });

  it('falla si el techo no es un material liso', () => {
    expect(check([withZone({ roof: 'vidrio' })])).toThrow(/techo/);
  });

  it('falla si la primera zona tiene selector o una siguiente no lo tiene', () => {
    expect(check([withZone({ where: { east: [0, 1] } })])).toThrow(/primera/);
    expect(check([look({ zones: [baseZone, { ...baseZone, id: 'b' }] })])).toThrow(/selector/);
  });
});
