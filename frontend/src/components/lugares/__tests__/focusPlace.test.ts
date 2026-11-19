import type { PlaceDetail } from '@shared/types';
import { toSceneData } from '@/components/map3d/sceneData';
import { layersWithGroups, CHILD_IDS, PRINCIPAL_ID } from '@/components/map3d/__fixtures__/mapLayers';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { highlightBuilding } from '../focusPlace';

const data = toSceneData(layersWithGroups);
const placeWith = (buildingIds: number[]) => ({ outline: { buildingIds } }) as unknown as PlaceDetail;
const fakeViewer = () => ({ setMarkedBuildings: jest.fn(), select: jest.fn() }) as unknown as Viewer & { select: jest.Mock };

describe('highlightBuilding', () => {
  it('un lugar ligado a un edificio agrupado selecciona a su principal', () => {
    const viewer = fakeViewer();
    expect(highlightBuilding(viewer, data, placeWith([CHILD_IDS[0]]), true)).toBe(true);
    expect(viewer.select).toHaveBeenCalledWith({ layer: 'campusBuildings', index: 0 }, true);
  });

  it('un principal sigue funcionando y un id desconocido no selecciona nada', () => {
    const viewer = fakeViewer();
    expect(highlightBuilding(viewer, data, placeWith([PRINCIPAL_ID]), false)).toBe(true);
    expect(highlightBuilding(viewer, data, placeWith([999]), false)).toBe(false);
    expect(viewer.select).toHaveBeenLastCalledWith(null, false);
  });
});
