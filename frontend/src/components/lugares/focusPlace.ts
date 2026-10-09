import type { PlaceDetail } from '@shared/types';
import type { SceneData } from '@/components/map3d/sceneData';
import type { Viewer } from '@/components/map3d/viewer/createViewer';

/** Resalta el edificio del lugar, si tiene; con `fly`, además lleva la cámara a él. */
export function highlightBuilding(viewer: Viewer, data: SceneData, place: PlaceDetail, fly: boolean): boolean {
  const building = data.campusBuildings.findIndex((b) => b.props.id === place.outline.buildingId);
  if (building < 0) {
    viewer.select(null, false);
    return false;
  }
  viewer.select({ layer: 'campusBuildings', index: building }, fly);
  return true;
}

/** Encuadre automático: el edificio del lugar si tiene; si no, el centro de su contorno. */
export function focusPlace(viewer: Viewer, data: SceneData, place: PlaceDetail) {
  if (highlightBuilding(viewer, data, place, true)) return;
  if (place.outline.centerLat !== null && place.outline.centerLon !== null) {
    viewer.focusLatLon(place.outline.centerLat, place.outline.centerLon);
  }
}
