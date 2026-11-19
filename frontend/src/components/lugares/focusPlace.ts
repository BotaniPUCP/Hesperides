import type { PlaceDetail } from '@shared/types';
import type { SceneData } from '@/components/map3d/sceneData';
import type { Viewer } from '@/components/map3d/viewer/createViewer';

/**
 * Resalta el edificio del lugar; con `fly`, además lleva la cámara a él. Un lugar
 * de varios bloques los marca todos y deja la cámara a quien llama. Devuelve si
 * la cámara ya quedó en el lugar.
 */
export function highlightBuilding(viewer: Viewer, data: SceneData, place: PlaceDetail, fly: boolean): boolean {
  const ids = place.outline.buildingIds;
  // El mapa de las fichas es el mismo de un lugar a otro: las marcas del anterior no deben quedarse.
  viewer.setMarkedBuildings(ids.length > 1 ? ids : []);
  // Un lugar ligado a un edificio agrupado se resuelve por su principal.
  const building = ids.length === 1 ? (data.buildingIndexById.get(ids[0]) ?? -1) : -1;
  if (building < 0) {
    viewer.select(null, false);
    return false;
  }
  viewer.select({ layer: 'campusBuildings', index: building }, fly);
  return true;
}

/** Encuadre automático: el edificio del lugar si es uno; si no, el centro de su contorno. */
export function focusPlace(viewer: Viewer, data: SceneData, place: PlaceDetail) {
  if (highlightBuilding(viewer, data, place, true)) return;
  if (place.outline.centerLat !== null && place.outline.centerLon !== null) {
    viewer.focusLatLon(place.outline.centerLat, place.outline.centerLon);
  }
}
