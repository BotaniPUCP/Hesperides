import * as THREE from 'three';
import type { Balloon } from '@shared/types';
import type { LocalPlane } from '../projection';
import {
  BALLOON_GROW_FROM_M, balloonScale, groupBySector, memberNearestCenter, mergeOverlapping, type ScreenBalloon,
} from '../balloons/balloonClusters';
import { fillGroup, group, resize, single, type BalloonButton, type Size } from './balloonButtons';
import type { GroundPoint } from './frameFit';
import { WORLD_LIFT } from './polyLayer';

/**
 * Los globos del mapa sobre la escena (SPEC-113 §5.4 y §7.1), como botones HTML: así se
 * pueden tocar, enfocar con Tab y leer con un lector de pantalla, y se ven nítidos a
 * cualquier zoom. De lejos, un grupo por sector; a media distancia, los que se pisan se juntan en
 * un grupo con su número, como hace Waze; de cerca, cada globo suelto. Todo globo y todo grupo se
 * clava en un punto fijo del mapa sobre un jardín o un ejemplar (el servidor ya reparte los que
 * comparten jardín, §5.3b): mover la cámara no los corre. Desde cierta distancia crecen con el mapa.
 */

/** Desde esta distancia de la cámara al centro de la vista, solo grupos por sector; se ajusta al verlo. */
export const FAR_DISTANCE_M = 700;
/** Tamaño del globo en pantalla; en táctil, 48 px para el dedo. La punta de la cola está al 91 % de la altura. */
const MOUSE_SIZE = { w: 40, h: 41 };
const TOUCH_SIZE = { w: 48, h: 49 };
const TIP = 64 / 70;

export interface BalloonLayerCallbacks {
  onPick: (balloon: Balloon) => void;
  /** Un grupo: la cámara se acerca hasta encuadrar a sus miembros. */
  onGroup: (points: GroundPoint[]) => void;
}

export interface BalloonLayer {
  set: (balloons: readonly Balloon[]) => void;
  update: (camera: THREE.Camera, width: number, height: number, distance: number) => void;
  dispose: () => void;
}

interface Placed {
  key: string;
  x: number;
  y: number;
  members: Balloon[];
}

export function createBalloonLayer(root: HTMLElement, plane: LocalPlane, cb: BalloonLayerCallbacks): BalloonLayer {
  let balloons: Balloon[] = [];
  const worlds = new Map<string, THREE.Vector3>();
  const buttons = new Map<string, BalloonButton>();
  const SIZE = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? TOUCH_SIZE : MOUSE_SIZE;
  const projected = new THREE.Vector3();

  const world = (b: Balloon) => {
    let v = worlds.get(b.id);
    if (!v) {
      const p = plane.toPlane(b.latitude, b.longitude);
      v = new THREE.Vector3(p.x, WORLD_LIFT + 0.5, -p.y);
      worlds.set(b.id, v);
    }
    return v;
  };

  const toScreen = (v: THREE.Vector3, camera: THREE.Camera, width: number, height: number) => {
    projected.copy(v).project(camera);
    if (projected.z >= 1 || projected.z <= -1) return null;
    return { x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height };
  };

  const points = (members: readonly Balloon[]): GroundPoint[] => members.map((m) => ({ x: world(m).x, z: world(m).z }));

  const far = (camera: THREE.Camera, width: number, height: number): Placed[] =>
    groupBySector(balloons).flatMap((g) => {
      const at = toScreen(world(g.members[memberNearestCenter(points(g.members))]), camera, width, height);
      return at ? [{ key: `g:${g.key}`, ...at, members: g.members }] : [];
    });

  const near = (camera: THREE.Camera, width: number, height: number, distance: number, size: Size): Placed[] => {
    const onScreen: ScreenBalloon[] = [];
    for (const b of balloons) {
      const at = toScreen(world(b), camera, width, height);
      if (at && at.x > -size.w && at.x < width + size.w && at.y > -size.h && at.y < height + size.h) {
        onScreen.push({ balloon: b, ...at });
      }
    }
    // De cerca nadie se junta: cada globo en su sitio. Más lejos, el grupo queda donde su más urgente.
    const clusters = distance < BALLOON_GROW_FROM_M
      ? onScreen.map((o) => ({ x: o.x, y: o.y, members: [o.balloon] }))
      : mergeOverlapping(onScreen, size);
    return clusters.map((c): Placed => ({
      key: c.members.length === 1 ? `b:${c.members[0].id}` : `g:${c.members.map((m) => m.id).join('|')}`,
      x: c.x, y: c.y, members: c.members,
    }));
  };

  const button = (p: Placed) => {
    let el = buttons.get(p.key);
    if (!el) {
      const created = p.key.startsWith('b:') ? single(p.members[0], cb) : group(p.members, () => cb.onGroup(points(created.members)));
      el = created;
      root.appendChild(el);
      buttons.set(p.key, el);
    }
    el.members = p.members;
    if (p.key.startsWith('g:')) fillGroup(el, p.members);
    return el;
  };

  return {
    set(next) {
      balloons = [...next];
      worlds.clear();
    },
    update(camera, width, height, distance) {
      const scale = balloonScale(distance);
      const size = { w: SIZE.w * scale, h: SIZE.h * scale };
      const placed = distance >= FAR_DISTANCE_M ? far(camera, width, height) : near(camera, width, height, distance, size);
      const used = new Set<string>();
      for (const p of placed) {
        const el = button(p);
        resize(el, size, scale);
        el.style.transform = `translate(${(p.x - size.w / 2).toFixed(1)}px,${(p.y - size.h * TIP).toFixed(1)}px)`;
        used.add(p.key);
      }
      for (const [key, el] of buttons) {
        if (!used.has(key)) {
          el.remove();
          buttons.delete(key);
        }
      }
    },
    dispose() {
      buttons.forEach((el) => el.remove());
      buttons.clear();
    },
  };
}
