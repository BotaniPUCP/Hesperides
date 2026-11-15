import * as THREE from 'three';
import type { Balloon } from '@shared/types';
import type { LocalPlane } from '../projection';
import {
  attentionDot, balloonIcon, balloonLabel, GROUP_ICON, groupBySector, mergeOverlapping, type ScreenBalloon,
} from '../balloons/balloonClusters';
import type { GroundPoint } from './frameFit';
import { WORLD_LIFT } from './polyLayer';

/**
 * Los globos del mapa sobre la escena (SPEC-113 §5.4 y §7.1), como botones HTML: así se
 * pueden tocar, enfocar con Tab y leer con un lector de pantalla, y se ven nítidos a
 * cualquier zoom. De lejos, un grupo por sector; de cerca, cada globo, y los que se pisan
 * se juntan en un grupo con su número, como hace Waze.
 */

/** Desde esta distancia de la cámara al centro de la vista, solo grupos por sector; se ajusta al verlo. */
export const FAR_DISTANCE_M = 700;
/** Tamaño del globo en pantalla; en táctil, 48 px para el dedo. La punta de la cola está al 91 % de la altura. */
const MOUSE_SIZE = { w: 40, h: 41 };
const TOUCH_SIZE = { w: 48, h: 49 };
const TIP = 64 / 70;
const GROUP_MAX = 99;

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
      const center = new THREE.Vector3();
      g.members.forEach((m) => center.add(world(m)));
      center.divideScalar(g.members.length);
      const at = toScreen(center, camera, width, height);
      return at ? [{ key: `g:${g.key}`, ...at, members: g.members }] : [];
    });

  const near = (camera: THREE.Camera, width: number, height: number): Placed[] => {
    const onScreen: ScreenBalloon[] = [];
    for (const b of balloons) {
      const at = toScreen(world(b), camera, width, height);
      if (at && at.x > -SIZE.w && at.x < width + SIZE.w && at.y > -SIZE.h && at.y < height + SIZE.h) {
        onScreen.push({ balloon: b, ...at });
      }
    }
    return mergeOverlapping(onScreen, SIZE).map((c) => ({
      key: c.members.length === 1 ? `b:${c.members[0].id}` : `g:${c.members.map((m) => m.id).join('|')}`,
      x: c.x, y: c.y, members: c.members,
    }));
  };

  const button = (p: Placed) => {
    let el = buttons.get(p.key);
    if (!el) {
      const created = p.key.startsWith('b:') ? single(p.members[0], cb) : group(p.members, () => cb.onGroup(points(created.members)));
      created.style.width = `${SIZE.w}px`;
      created.style.height = `${SIZE.h}px`;
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
      const placed = distance >= FAR_DISTANCE_M ? far(camera, width, height) : near(camera, width, height);
      const used = new Set<string>();
      for (const p of placed) {
        const el = button(p);
        el.style.transform = `translate(${(p.x - SIZE.w / 2).toFixed(1)}px,${(p.y - SIZE.h * TIP).toFixed(1)}px)`;
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

type BalloonButton = HTMLButtonElement & { members: Balloon[] };

const BUTTON_CLASS = 'group pointer-events-auto absolute left-0 top-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';
const IMAGE_CLASS = 'block h-full w-full drop-shadow transition-transform group-hover:-translate-y-0.5';

function base(label: string): BalloonButton {
  const el = document.createElement('button') as BalloonButton;
  el.type = 'button';
  el.className = BUTTON_CLASS;
  el.setAttribute('aria-label', label);
  el.title = label;
  const img = document.createElement('img');
  img.alt = '';
  img.className = IMAGE_CLASS;
  img.draggable = false;
  el.appendChild(img);
  return el;
}

function single(b: Balloon, cb: BalloonLayerCallbacks): BalloonButton {
  const el = base(balloonLabel(b));
  el.dataset.balloon = b.id;
  (el.firstChild as HTMLImageElement).src = balloonIcon(b);
  el.addEventListener('click', (e) => { e.stopPropagation(); cb.onPick(el.members[0]); });
  return el;
}

function group(members: Balloon[], onClick: () => void): BalloonButton {
  const el = base('');
  (el.firstChild as HTMLImageElement).src = GROUP_ICON;
  const count = document.createElement('span');
  count.className = 'pointer-events-none absolute inset-x-0 top-[31%] text-center text-[13px] font-extrabold leading-none text-[#1F2A33]';
  const dot = document.createElement('span');
  dot.className = 'pointer-events-none absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-[#1F2A33]';
  el.append(count, dot);
  el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  el.members = members;
  return el;
}

function fillGroup(el: BalloonButton, members: readonly Balloon[]) {
  const n = members.length;
  const text = n > GROUP_MAX ? `${GROUP_MAX}+` : String(n);
  const [, count, dot] = el.children as unknown as [HTMLImageElement, HTMLSpanElement, HTMLSpanElement];
  if (count.textContent !== text) count.textContent = text;
  const color = attentionDot(members);
  dot.style.display = color ? '' : 'none';
  if (color) dot.style.background = color;
  const label = `Grupo de ${n} globos${color ? ', alguno pide atención' : ''}. Acercar`;
  if (el.getAttribute('aria-label') !== label) {
    el.setAttribute('aria-label', label);
    el.title = label;
  }
}
