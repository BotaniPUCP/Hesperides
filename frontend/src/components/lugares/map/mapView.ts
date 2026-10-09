import type { GeoPoint, PlaceMapView } from '@shared/types';
import type { LocalPlane } from '@/components/map3d/projection';
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

export function poseToMapView(plane: LocalPlane, pose: CameraPose): PlaceMapView {
  return { camera: toGeo(plane, pose.position), target: toGeo(plane, pose.target) };
}

export function mapViewToPose(plane: LocalPlane, view: PlaceMapView): CameraPose {
  return { position: toScene(plane, view.camera), target: toScene(plane, view.target) };
}
