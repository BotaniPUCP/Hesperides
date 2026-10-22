import type { GeoPoint, PlaceMapView } from '@shared/types';
import { LocalPlane as LocalPlaneAt, type LocalPlane } from './projection';
import type { CameraPose } from './viewer/cameraRig';
import { WORLD_LIFT } from './viewer/polyLayer';

/**
 * Convierte una pose de cámara a vista guardada (WGS 84 y altura sobre el suelo)
 * para que no dependa del origen del plano local.
 */
type Vec3 = [number, number, number];

function toGeo(plane: LocalPlane, [x, y, z]: Vec3): GeoPoint {
  const [lat, lon] = plane.toLatLon({ x, y: -z });
  return { lat, lon, heightM: y - WORLD_LIFT };
}

function toScene(plane: LocalPlane, point: GeoPoint): Vec3 {
  const { x, y } = plane.toPlane(point.lat, point.lon);
  return [x, point.heightM + WORLD_LIFT, -y];
}

const BEHIND_M = 55;
const CAMERA_HEIGHT_M = 55;
const AHEAD_M = 35;

/** Cámara detrás del punto de la foto, elevada y mirando en el rumbo de la foto. */
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
