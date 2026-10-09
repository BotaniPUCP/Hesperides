import type { SceneData } from '../sceneData';
import { infoFor } from '../infoCard';

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
  it('una planta medida muestra sus medidas y enlaza a su ficha del inventario', () => {
    const info = infoFor(data, { layer: 'vegetation', index: 0 });

    expect(info.kind).toBe('Palmera');
    expect(info.title).toBe('Palmera real');
    expect(info.rows).toContainEqual(['Código', 'EV-000001']);
    expect(info.rows).toContainEqual(['Altura', '7.5 m (medida)']);
    expect(info.note).toBeUndefined();
    expect(info.link).toEqual({ href: '/inventario-verde/especies/roystonea-regia/ejemplares/EV-000001', label: 'Ver ficha en el inventario' });
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
