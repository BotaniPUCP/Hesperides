import { markedPrincipalIndexes, toSceneData } from '../sceneData';
import { sampleLayers as response, layersWithGroups, layersFormat2, PRINCIPAL_ID, CHILD_IDS } from '../__fixtures__/mapLayers';

describe('toSceneData', () => {
  const data = toSceneData(response);

  it('separa las áreas verdes de las xerofíticas', () => {
    expect(data.greenAreas.map((f) => f.props.code)).toEqual(['AV-0001', 'AV-0002']);
    expect(data.xerophytic.map((f) => f.props.code)).toEqual(['XE-0001']);
  });

  it('la capa de reserva junta las secciones reservables y las subsecciones', () => {
    expect(data.reserve.map((f) => f.props.code)).toEqual(['AV-0002', 'AV-0002-1']);
  });

  it('separa los edificios del campus de los del entorno', () => {
    expect(data.campusBuildings.map((b) => b.props.id)).toEqual([1]);
    expect(data.contextBuildings.map((b) => b.props.id)).toEqual([2]);
  });

  it('reparte el mobiliario por tipo', () => {
    expect(data.bins).toHaveLength(1);
    expect(data.gates).toHaveLength(1);
    expect(data.fauna).toHaveLength(1);
    expect(data.fountains).toHaveLength(1);
    expect(data.parking).toHaveLength(1);
    expect(data.sidewalks).toHaveLength(1);
    expect(data.campus).toHaveLength(1);
  });

  it('proyecta al plano local desde el origen de la respuesta', () => {
    expect(data.references[0].p).toEqual([0, 0]);
    const ring = data.greenAreas[0].g[0][0];
    expect(ring[0]).toBeCloseTo(0, 6);
    expect(ring[1]).toBeCloseTo(0, 6);
  });

  it('quita el vértice de cierre repetido de cada anillo', () => {
    // GeoJSON repite el primer vértice al final; el extruido no lo necesita.
    expect(data.greenAreas[0].g[0][0]).toHaveLength(8);
  });

  it('nombra los sectores por su código', () => {
    expect(data.sectorNameByCode['SEC-VERDE-01']).toBe('Sector verde 01');
  });

  it('falla si falta el límite del campus, sin el cual no hay maqueta', () => {
    const sinLimite = { ...response, layers: { ...response.layers, features: { type: 'FeatureCollection' as const, features: [] } } };
    expect(() => toSceneData(sinLimite)).toThrow(/límite del campus/);
  });
});

describe('edificios agrupados', () => {
  const grouped = toSceneData(layersWithGroups);

  it('separa principales y agrupados', () => {
    expect(grouped.campusBuildings.map((b) => b.props.id)).toEqual([PRINCIPAL_ID]);
    expect(grouped.groupedBuildings.map((b) => b.props.id)).toEqual(CHILD_IDS);
    expect(grouped.buildingIndexById.get(CHILD_IDS[0])).toBe(0);
    expect(grouped.buildingIndexById.get(PRINCIPAL_ID)).toBe(0);
  });

  it('trata como principal un edificio sin parentId', () => {
    const old = toSceneData(layersFormat2);
    expect(old.campusBuildings.map((b) => b.props.id)).toEqual([1]);
    expect(old.groupedBuildings).toEqual([]);
  });

  it('marcar el id de un hijo marca el índice del principal', () => {
    expect([...markedPrincipalIndexes(grouped.buildingIndexById, [CHILD_IDS[1], 999])]).toEqual([0]);
  });
});
