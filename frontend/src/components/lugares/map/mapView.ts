import type { GeoPoint, PlaceMapView } from '@shared/types';
import { LocalPlane as LocalPlaneAt, type LocalPlane } from '@/components/map3d/projection';
import type { CameraPose } from '@/components/map3d/viewer/cameraRig';
import { WORLD_LIFT } from '@/components/map3d/viewer/polyLayer';

/**
 * Entre la pose de la cámara (coordenadas de la escena: x al este, z al sur, y
 * hacia arriba con el suelo elevado WORLD_LIFT) y la vista guardada (lat/lon y
 * altura sobre el suelo). Se guarda en lat/lon para que la vista no dependa del
 * origen del plano local.
 */

type Vec3 = [number, number, number];

function toGeo(plane: LocalPlane, [x, y, z]: Vec3): GeoPoint {
  const [lat, lon] = plane.toLatLon({ x, y: -z });
  return { lat, lon, heightM: y - WORLD_LIFT };
}

function toScene(plane: LocalPlane, p: GeoPoint): Vec3 {
  const { x, y } = plane.toPlane(p.lat, p.lon);
  return [x, p.heightM + WORLD_LIFT, -y];
}

/** Distancias de la vista por defecto de una perspectiva, en metros. */
const BEHIND_M = 55;
// Alto y lejos: a ras de los techos, los edificios vecinos tapan lo que mira la foto.
const CAMERA_HEIGHT_M = 55;
const AHEAD_M = 35;

/**
 * La vista por defecto de una perspectiva sin vista guardada: la cámara detrás
 * del punto y algo elevada, mirando hacia donde mira la foto. Así el mapa
 * muestra lo mismo que la foto, más o menos desde el mismo sitio.
 */
export function defaultPerspectiveView(lat: number, lon: number, headingDeg: number): PlaceMapView {
  const local = new LocalPlaneAt(lat, lon);
  const rad = (headingDeg * Math.PI) / 180;
  const dx = Math.sin(rad), dy = Math.cos(rad);
  const [cLat, cLon] = local.toLatLon({ x: -dx * BEHIND_M, y: -dy * BEHIND_M });
  const [tLat, tLon] = local.toLatLon({ x: dx * AHEAD_M, y: dy * AHEAD_M });
  return { camera: { lat: cLat, lon: cLon, heightM: CAMERA_HEIGHT_M }, target: { lat: tLat, lon: tLon, heightM: 0 } };
}

export function poseToMapView(plane: LocalPlane, pose: CameraPose): PlaceMapView {
  return { camera: toGeo(plane, pose.position), target: toGeo(plane, pose.target) };
}

export function mapViewToPose(plane: LocalPlane, view: PlaceMapView): CameraPose {
  return { position: toScene(plane, view.camera), target: toScene(plane, view.target) };
}
