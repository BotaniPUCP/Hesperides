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
} as unknown as SceneData;

describe('infoFor', () => {
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
});
