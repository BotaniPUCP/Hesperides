import type { SceneData } from '../sceneData';
import { infoFor } from '../infoCard';
import { toSceneData } from '../sceneData';
import { layersWithGroups } from '../__fixtures__/mapLayers';

const data = {
  sectorNameByCode: { 'SEC-VERDE-02': 'Sector verde 02' },
  greenAreas: [{
    g: [], props: {
      code: 'AV-0250', name: 'Jardín Tinkuy', description: null, parentCode: 'SEC-VERDE-02', mapCode: 'D 9',
      useType: 'Áreas de uso recreativo/descanso', reservable: true, reservationOwner: 'DAF', areaM2: 300.761,
      landscapeType: 'GREEN_AREA', irrigationCurrent: 'Sin riego tecnificado', irrigationProject: 'Goteo',
    },
  }],
  campusBuildings: [{
    g: [], props: { id: 9, name: 'Tinkuy', inferredName: true, category: 'Servicios y bienestar', campus: true, heightM: null, levels: 2, source: 'OSM', aliases: null },
  }],
  references: [{ p: [0, 0], props: { code: 'REF-0081', name: 'Tinkuy', category: 'Servicios PUCP', parentCode: null, aliases: ['Comedor Tinkuy'] } }],
  vegetation: [
    { p: [0, 0], props: { code: 'EV-000001', speciesSlug: 'roystonea-regia', commonName: 'Palmera real', scientificName: 'Roystonea regia',
      typeCode: 'PALM', typeLabel: 'Palmera', quantity: 1, heightM: 7.5, crownRadiusM: 3.4 } },
    { p: [0, 0], props: { code: 'EV-000400', speciesSlug: 'agave-americana', commonName: 'Pita', scientificName: 'Agave americana',
      typeCode: 'SHRUB', typeLabel: 'Arbusto', quantity: 3, heightM: null, crownRadiusM: null } },
  ],
  fountains: [
    { p: [0, 0], props: { code: 'PT_bb1', type: 'DRINKING_FOUNTAIN', typeLabel: 'Bebedero', name: 'Maestranza - Salida del baño',
      attributes: { tipo: 'BOTTLE_FILLER', estado: 'DETERIORATED', sector: 'CAMPUS', nota: 'Gotea' } } },
    { p: [0, 0], props: { code: 'PT_bb2', type: 'DRINKING_FOUNTAIN', typeLabel: 'Bebedero', name: 'Sin datos', attributes: { tipo: 'RARO' } } },
  ],
} as unknown as SceneData;

describe('infoFor', () => {
  it('una planta medida muestra sus medidas y enlaza a su ficha del catastro', () => {
    const info = infoFor(data, { layer: 'vegetation', index: 0 });

    expect(info.kind).toBe('Palmera');
    expect(info.title).toBe('Palmera real');
    expect(info.rows).toContainEqual(['Código', 'EV-000001']);
    expect(info.rows).toContainEqual(['Altura', '7.5 m (medida)']);
    expect(info.note).toBeUndefined();
    expect(info.link).toEqual({ href: '/catastro/ejemplares/EV-000001', label: 'Ver ficha en el catastro' });
  });

  it('una planta sin medir avisa que su tamaño en la maqueta es ilustrativo', () => {
    const info = infoFor(data, { layer: 'vegetation', index: 1 });

    expect(info.rows.find(([k]) => k === 'Altura')).toBeUndefined();
    expect(info.rows).toContainEqual(['Agrupación', '3 plantas']);
    expect(info.note).toMatch(/ilustrativ/);
  });

  it('una sección muestra su sector por nombre, no por código', () => {
    const info = infoFor(data, { layer: 'greenAreas', index: 0 });

    expect(info.kind).toBe('Área verde');
    expect(info.title).toBe('Jardín Tinkuy');
    expect(info.rows).toContainEqual(['Sector', 'Sector verde 02']);
    expect(info.rows).toContainEqual(['Área', '301 m²']);
    expect(info.rows).toContainEqual(['Reservable', 'Sí, presta DAF']);
  });

  it('un edificio sin altura en OSM avisa que la maqueta usa 8 m', () => {
    const info = infoFor(data, { layer: 'campusBuildings', index: 0 });

    expect(info.title).toBe('Tinkuy');
    expect(info.rows).toContainEqual(['Altura', '8 m (estimada)']);
    expect(info.note).toMatch(/no registra la altura/);
  });

  it('un nombre deducido se declara como tal', () => {
    expect(infoFor(data, { layer: 'campusBuildings', index: 0 }).rows).toContainEqual(['Nombre', 'Deducido, sin confirmar']);
  });

  it('una referencia muestra su categoría y sus alias', () => {
    const info = infoFor(data, { layer: 'references', index: 0 });

    expect(info.kind).toBe('Servicios PUCP');
    expect(info.rows).toContainEqual(['También se le dice', 'Comedor Tinkuy']);
  });

  it('las filas sin dato no se muestran', () => {
    const rows = infoFor(data, { layer: 'references', index: 0 }).rows;
    expect(rows.every(([, v]) => v !== null && v !== '')).toBe(true);
  });

  it('un bebedero muestra su tipo y su estado en palabras (CA-10)', () => {
    const c = infoFor(data, { layer: 'fountains', index: 0 });
    expect(c.kind).toBe('Bebedero');
    expect(c.title).toBe('Maestranza - Salida del baño');
    expect(c.rows).toEqual(expect.arrayContaining([['Tipo', 'Llenador de botella'], ['Estado', 'En deterioro'], ['Nota', 'Gotea']]));
  });

  it('un código de bebedero desconocido se muestra tal cual en vez de esconderse', () => {
    expect(infoFor(data, { layer: 'fountains', index: 1 }).rows).toEqual(expect.arrayContaining([['Tipo', 'RARO']]));
  });
});

describe('ficha de un edificio del plano', () => {
  const card = infoFor(toSceneData(layersWithGroups), { layer: 'campusBuildings', index: 0 });
  const row = (label: string) => card.rows.find(([l]) => l === label)?.[1];

  it('muestra los códigos oficiales', () => {
    expect(row('Códigos oficiales')).toBe('C51 · PABELLÓN X; C52 · PABELLÓN Y');
  });

  it('dice cuántos edificios del mapa agrupa y cuáles son', () => {
    expect(row('Agrupa 2 edificios del mapa')).toBe('CEMDUC, Teatro');
  });
});

describe('ficha de un edificio: filas que no informan', () => {
  const building = data.campusBuildings[0].props;
  const cardOf = (props: Partial<typeof building>) =>
    infoFor({ ...data, campusBuildings: [{ g: [], props: { ...building, inferredName: false, ...props } }] } as SceneData, { layer: 'campusBuildings', index: 0 });
  const row = (info: ReturnType<typeof infoFor>, label: string) => info.rows.find(([l]) => l === label)?.[1];

  it('una rampa que es solo suelo (groundOnly, 0 o 0,1 m) no muestra su altura', () => {
    for (const heightM of [0, 0.1]) {
      const info = cardOf({ name: 'Entrada Parking subterráneo 1', heightM });
      expect(row(info, 'Altura')).toBeUndefined();
      expect(info.note).toBeUndefined();
    }
  });

  it('un edificio con altura del plano la muestra', () => {
    expect(row(cardOf({ heightM: 12.5 }), 'Altura')).toBe('12.5 m');
  });

  it('«También se le dice» omite los alias que repiten el nombre, sin mirar mayúsculas ni tildes', () => {
    expect(row(cardOf({ name: 'Tesorería General', aliases: ['TESORERIA GENERAL', 'Caja'] }), 'También se le dice')).toBe('Caja');
  });

  it('si su único alias es el nombre, no muestra la fila', () => {
    expect(row(cardOf({ name: 'CETAM', aliases: ['cetam'] }), 'También se le dice')).toBeUndefined();
  });
});
