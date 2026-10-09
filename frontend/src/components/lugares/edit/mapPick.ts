import type { OutlineInput } from '@shared/types';
import type { LocalPlane } from '@/components/map3d/projection';
import type { SceneData } from '@/components/map3d/sceneData';
import type { Target } from '@/components/map3d/target';

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

/**
 * El contorno que da un elemento pulsado en el mapa: un edificio del campus, un
 * área verde (sección o subsección) o un estacionamiento. Lo demás no tiene
 * contorno propio.
 */
export function outlineFromTarget(data: SceneData, target: Target): PickedOutline | null {
  switch (target.layer) {
    case 'campusBuildings': {
      const b = data.campusBuildings[target.index].props;
      return { outline: { buildingId: b.id }, label: b.name ?? `Edificio sin nombre (${b.id})` };
    }
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

/** Un punto marcado a mano como contorno, para lo que no está dibujado en el mapa. */
export function pointOutline(p: LatLon): PickedOutline {
  return {
    outline: { geometry: { type: 'Point', coordinates: [p.lon, p.lat] } },
    label: `Punto marcado (${p.lat.toFixed(6)}, ${p.lon.toFixed(6)})`,
  };
}
