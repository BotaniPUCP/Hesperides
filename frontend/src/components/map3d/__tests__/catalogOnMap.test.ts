import type { MapCatalog, MapPlace } from '@shared/types';
import { toSceneData } from '../sceneData';
import { layersWithGroups, CHILD_IDS, PRINCIPAL_ID } from '../__fixtures__/mapLayers';
import { placeOfPrincipal } from '../catalog/catalogOnMap';

const data = toSceneData(layersWithGroups);
const place = (code: string, buildingIds: number[]): MapPlace => ({ code, name: code, parentName: null, buildingIds, lat: null, lon: null });
const catalogOf = (...places: MapPlace[]) => ({ places, perspectives: [] }) as unknown as MapCatalog;

describe('placeOfPrincipal', () => {
  it('al pulsar un principal encuentra el lugar ligado a uno de sus edificios agrupados', () => {
    expect(placeOfPrincipal(catalogOf(place('L-1', [CHILD_IDS[1]])), data, PRINCIPAL_ID)?.code).toBe('L-1');
  });

  it('el lugar ligado al principal gana al del hijo', () => {
    const catalog = catalogOf(place('L-HIJO', [CHILD_IDS[0]]), place('L-PRINCIPAL', [PRINCIPAL_ID]));
    expect(placeOfPrincipal(catalog, data, PRINCIPAL_ID)?.code).toBe('L-PRINCIPAL');
  });

  it('sin lugar ligado devuelve nulo', () => {
    expect(placeOfPrincipal(catalogOf(place('L-X', [999])), data, PRINCIPAL_ID)).toBeNull();
    expect(placeOfPrincipal(null, data, PRINCIPAL_ID)).toBeNull();
  });
});
