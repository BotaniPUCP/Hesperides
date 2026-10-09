import { toSceneData } from '@/components/map3d/sceneData';
import { sampleLayers } from '@/components/map3d/__fixtures__/mapLayers';
import { LocalPlane } from '@/components/map3d/projection';
import { headingBetween, outlineFromTarget } from '../mapPick';

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
    expect(picked?.outline).toEqual({ buildingId: data.campusBuildings[0].props.id });
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
