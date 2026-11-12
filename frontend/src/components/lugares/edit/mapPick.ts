import type { OutlineInput } from '@shared/types';
import type { LocalPlane } from '@/components/map3d/projection';
import type { SceneData } from '@/components/map3d/sceneData';
import type { Target } from '@/components/map3d/target';
import type { Viewer } from '@/components/map3d/viewer/createViewer';

export interface LatLon {
  lat: number;
  lon: number;
}

/** Dos clics más juntos que esto no marcan una dirección: fue un doble clic. */
const MIN_DIRECTION_M = 1;

/** Rumbo de `from` a `to` en grados, 0 al norte y creciendo hacia el este; null si están encima. */
export function headingBetween(plane: LocalPlane, from: LatLon, to: LatLon): number | null {
  const a = plane.toPlane(from.lat, from.lon);
  const b = plane.toPlane(to.lat, to.lon);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < MIN_DIRECTION_M) return null;
  const degrees = (Math.atan2(dx, dy) * 180) / Math.PI;
  const normalized = Math.round(((degrees % 360) + 360) * 10) / 10 % 360;
  return normalized;
}

export interface PickedOutline {
  outline: OutlineInput;
  label: string;
}

/** El contorno de un complejo: se calcula con el de los lugares que contiene. */
export const CHILDREN_OUTLINE: PickedOutline = {
  outline: { fromChildren: true },
  label: 'El de los lugares que contiene (se calcula solo)',
};

/** El nombre de un edificio en el mapa; si ya no está, su id. */
export function buildingName(data: SceneData, id: number): string {
  const building = data.campusBuildings.find((b) => b.props.id === id);
  if (!building) return `Edificio ${id}`;
  return building.props.name ?? `Edificio sin nombre (${id})`;
}

export function buildingsOutline(data: SceneData, ids: readonly number[]): PickedOutline {
  const names = ids.map((id) => buildingName(data, id));
  return { outline: { buildingIds: [...ids] }, label: names.length === 1 ? names[0] : `${names.length} edificios: ${names.join(', ')}` };
}

/**
 * El contorno que da un elemento pulsado en el mapa: un edificio del campus, un
 * área verde (sección o subsección) o un estacionamiento. Lo demás no tiene
 * contorno propio.
 */
export function outlineFromTarget(data: SceneData, target: Target): PickedOutline | null {
  switch (target.layer) {
    case 'campusBuildings':
      return buildingsOutline(data, [data.campusBuildings[target.index].props.id]);
    case 'greenAreas':
    case 'xerophytic':
    case 'reserve': {
      const z = data[target.layer][target.index].props;
      return { outline: { zoneCode: z.code }, label: z.name ? `${z.name} (${z.code})` : z.code };
    }
    case 'parking': {
      const f = data.parking[target.index].props;
      return { outline: { featureCode: f.code }, label: f.name ?? `Estacionamiento ${f.code}` };
    }
    default:
      return null;
  }
}

/** Sin el edificio si ya estaba, con él si no. Sin edificios no queda contorno. */
export function toggleBuilding(data: SceneData, ids: readonly number[], id: number): PickedOutline | null {
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  return next.length === 0 ? null : buildingsOutline(data, next);
}

/**
 * Un clic en el mapa al elegir el contorno. Los edificios se suman (un lugar
 * puede ser varios bloques); un área verde o un estacionamiento reemplaza lo elegido.
 */
export function pickOnMap(current: PickedOutline | null, data: SceneData, target: Target): PickedOutline | null {
  if (target.layer !== 'campusBuildings') return outlineFromTarget(data, target) ?? current;
  return toggleBuilding(data, current?.outline.buildingIds ?? [], data.campusBuildings[target.index].props.id);
}

/** Enfoca el contorno seleccionado al abrir el editor. */
export function focusPickedOutline(viewer: Viewer, data: SceneData, picked: PickedOutline | null, initialCenter?: LatLon): void {
  if (!picked) return;
  const outline = picked.outline;
  const buildingIds = outline.buildingIds ?? [];

  if (buildingIds.length === 1) {
    const index = data.campusBuildings.findIndex((building) => building.props.id === buildingIds[0]);
    if (index >= 0) {
      viewer.select({ layer: 'campusBuildings', index }, true);
      return;
    }
  }

  if (buildingIds.length > 1) {
    if (initialCenter) {
      viewer.focusLatLon(initialCenter.lat, initialCenter.lon);
      return;
    }
    const buildings = data.campusBuildings.filter((building) => buildingIds.includes(building.props.id));
    const points = buildings.flatMap((building) => building.g.flatMap((polygon) => polygon.flatMap((ring) => {
      const coordinates: { x: number; y: number }[] = [];
      for (let i = 0; i + 1 < ring.length; i += 2) coordinates.push({ x: ring[i], y: ring[i + 1] });
      return coordinates;
    })));
    if (points.length > 0) {
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      const [lat, lon] = data.plane.toLatLon({
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
      });
      viewer.focusLatLon(lat, lon);
      return;
    }
  }

  for (const layer of ['greenAreas', 'xerophytic', 'reserve'] as const) {
    const index = data[layer].findIndex((zone) => zone.props.code === outline.zoneCode);
    if (index >= 0) {
      viewer.select({ layer, index }, true);
      return;
    }
  }
  if (outline.featureCode) {
    const index = data.parking.findIndex((feature) => feature.props.code === outline.featureCode);
    if (index >= 0) {
      viewer.select({ layer: 'parking', index }, true);
      return;
    }
  }

  const coordinates = outline.geometry?.coordinates;
  if (outline.geometry?.type === 'Point' && coordinates) {
    viewer.focusLatLon(coordinates[1], coordinates[0]);
    return;
  }
  if (initialCenter) viewer.focusLatLon(initialCenter.lat, initialCenter.lon);
}

/** Un punto marcado a mano como contorno, para lo que no está dibujado en el mapa. */
export function pointOutline(p: LatLon): PickedOutline {
  return {
    outline: { geometry: { type: 'Point', coordinates: [p.lon, p.lat] } },
    label: `Punto marcado (${p.lat.toFixed(6)}, ${p.lon.toFixed(6)})`,
  };
}
