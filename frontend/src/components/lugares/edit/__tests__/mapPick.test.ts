import { toSceneData } from '@/components/map3d/sceneData';
import { layersWithGroups, CHILD_IDS, layersWithTwoBlocks, sampleLayers, SECOND_BLOCK_ID } from '@/components/map3d/__fixtures__/mapLayers';
import { LocalPlane } from '@/components/map3d/projection';
import { buildingsOutline, CHILDREN_OUTLINE, headingBetween, outlineFromTarget, pickOnMap } from '../mapPick';

const plane = new LocalPlane(-12.07, -77.08);
/** ~22 m en grados en el campus. */
const D = 0.0002;
const at = { lat: -12.07, lon: -77.08 };

describe('headingBetween', () => {
  it.each([
    ['norte', { lat: at.lat + D, lon: at.lon }, 0],
    ['este', { lat: at.lat, lon: at.lon + D }, 90],
    ['sur', { lat: at.lat - D, lon: at.lon }, 180],
    ['oeste', { lat: at.lat, lon: at.lon - D }, 270],
  ])('mirando al %s da %i°', (_name, to, expected) => {
    expect(headingBetween(plane, at, to)).toBeCloseTo(expected, 0);
  });

  it('nunca devuelve 360: el rango es [0, 360)', () => {
    const heading = headingBetween(plane, at, { lat: at.lat + D, lon: at.lon - 0.0000000001 });
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThan(360);
  });

  it('dos clics casi en el mismo sitio no dan dirección', () => {
    expect(headingBetween(plane, at, { lat: at.lat + 0.000001, lon: at.lon })).toBeNull();
  });
});

describe('outlineFromTarget', () => {
  const data = toSceneData(sampleLayers);

  it('un edificio del campus da su id', () => {
    const picked = outlineFromTarget(data, { layer: 'campusBuildings', index: 0 });
    expect(picked?.outline).toEqual({ buildingIds: [data.campusBuildings[0].props.id] });
  });

  it('un área verde da el código de su sección', () => {
    const picked = outlineFromTarget(data, { layer: 'greenAreas', index: 0 });
    expect(picked?.outline).toEqual({ zoneCode: data.greenAreas[0].props.code });
  });

  it('un estacionamiento da el código del componente', () => {
    const picked = outlineFromTarget(data, { layer: 'parking', index: 0 });
    expect(picked?.outline).toEqual({ featureCode: data.parking[0].props.code });
  });

  it('una planta o un tacho no sirven de contorno', () => {
    expect(outlineFromTarget(data, { layer: 'vegetation', index: 0 })).toBeNull();
    expect(outlineFromTarget(data, { layer: 'bins', index: 0 })).toBeNull();
  });
});

describe('pickOnMap: un lugar puede ser varios bloques', () => {
  const data = toSceneData(layersWithTwoBlocks);
  const first = { layer: 'campusBuildings', index: 0 } as const;
  const second = { layer: 'campusBuildings', index: 1 } as const;
  const firstId = data.campusBuildings[0].props.id;

  it('cada edificio pulsado se suma a los ya elegidos', () => {
    const two = pickOnMap(pickOnMap(null, data, first), data, second);

    expect(two?.outline).toEqual({ buildingIds: [firstId, SECOND_BLOCK_ID] });
  });

  it('pulsar otra vez un edificio elegido lo quita', () => {
    const two = pickOnMap(pickOnMap(null, data, first), data, second);

    expect(pickOnMap(two, data, first)?.outline).toEqual({ buildingIds: [SECOND_BLOCK_ID] });
  });

  it('quitar el último edificio deja el lugar sin contorno', () => {
    expect(pickOnMap(pickOnMap(null, data, first), data, first)).toBeNull();
  });

  it('un área verde reemplaza a los edificios, y un edificio después empieza una lista nueva', () => {
    const zone = pickOnMap(pickOnMap(null, data, first), data, { layer: 'greenAreas', index: 0 });
    expect(zone?.outline).toEqual({ zoneCode: data.greenAreas[0].props.code });

    expect(pickOnMap(zone, data, second)?.outline).toEqual({ buildingIds: [SECOND_BLOCK_ID] });
  });

  it('lo que no tiene contorno no cambia la elección', () => {
    const one = pickOnMap(null, data, first);
    expect(pickOnMap(one, data, { layer: 'vegetation', index: 0 })).toBe(one);
  });

  it('nombra un edificio por su nombre y varios por cuántos son y cuáles', () => {
    expect(buildingsOutline(data, [SECOND_BLOCK_ID]).label).toBe('Bloque B');
    expect(buildingsOutline(data, [firstId, SECOND_BLOCK_ID]).label).toBe(`2 edificios: Edificio sin nombre (${firstId}), Bloque B`);
  });

  it('un edificio que ya no está en el mapa se nombra por su id', () => {
    expect(buildingsOutline(data, [999]).label).toBe('Edificio 999');
  });

  it('un complejo toma el contorno de sus hijos', () => {
    expect(CHILDREN_OUTLINE.outline).toEqual({ fromChildren: true });
  });
});

describe('contorno con un edificio agrupado', () => {
  it('un lugar con el id de un hijo dibuja el nombre de su propio edificio', () => {
    const picked = buildingsOutline(toSceneData(layersWithGroups), [CHILD_IDS[0]]);
    expect(picked.label).toBe('CEMDUC');
    expect(picked.outline).toEqual({ buildingIds: [CHILD_IDS[0]] });
  });
});
