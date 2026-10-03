import type { PlaceDetail } from '@shared/types';
import type { SceneData } from '@/components/map3d/sceneData';
import type { Viewer } from '@/components/map3d/viewer/createViewer';

/** Lleva la cámara al lugar: resalta su edificio si lo tiene; si no, va al centro de su contorno. */
export function focusPlace(viewer: Viewer, data: SceneData, place: PlaceDetail) {
  const building = data.campusBuildings.findIndex((b) => b.props.id === place.outline.buildingId);
  if (building >= 0) viewer.select({ layer: 'campusBuildings', index: building }, true);
  else if (place.outline.centerLat !== null && place.outline.centerLon !== null) {
    viewer.focusLatLon(place.outline.centerLat, place.outline.centerLon);
  }
}
