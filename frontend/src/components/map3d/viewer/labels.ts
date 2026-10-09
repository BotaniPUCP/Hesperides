import * as THREE from 'three';
import type { SceneData } from '../sceneData';
import type { Meta } from './geometry';
import { WORLD_LIFT } from './polyLayer';

/**
 * Etiquetas HTML sobre la escena (edificios, jardines con nombre y puertas), del
 * prototipo v39. Se colocan por prioridad y se ocultan si se pisan con otra.
 */

type LabelKind = 'building' | 'garden' | 'gate';

interface Anchor {
  el: HTMLDivElement;
  kind: LabelKind;
  v: THREE.Vector3;
  priority: number;
  maxDistance: number;
  dy: number;
  w: number;
  h: number;
  on: boolean;
}

const CLASS: Record<LabelKind, string> = {
  building: 'text-[12px] font-semibold text-[#5A1080]',
  garden: 'text-[11.5px] font-semibold text-[#E0FFE8] [text-shadow:0_0_3px_rgba(0,0,0,.7),0_1px_2px_rgba(0,0,0,.8)]',
  gate: 'text-[11px] font-semibold text-[#5A6C99]',
};
/** Alturas sobre el suelo de la maqueta, que está elevado WORLD_LIFT metros. */
const ROOF_CLEARANCE_M = 3;
const GARDEN_LABEL_M = 1.5;
const GATE_LABEL_M = 8.5;
const HALO = '[text-shadow:0_0_2px_#fff,0_0_3px_#fff,0_0_5px_#fff]';

/** «Facultad de Psicología» → «Psicología»: en la maqueta sobra el prefijo. */
export function shortName(name: string): string {
  return name.replace(/^Facultad de /, '').replace(/^Departamento de /, 'Depto. ').replace(/^Sección /, '').replace(/\s*\(.*\)\s*$/, '').trim();
}

export interface Labels {
  update: (camera: THREE.Camera, width: number, height: number, visible: (kind: LabelKind) => boolean) => void;
  dispose: () => void;
}

export function createLabels(root: HTMLElement, data: SceneData, buildingMeta: Meta[], greenMeta: Meta[]): Labels {
  const anchors: Anchor[] = [];
  const add = (text: string, kind: LabelKind, v: THREE.Vector3, priority: number, maxDistance: number, dy = 0) => {
    const el = document.createElement('div');
    el.className = `pointer-events-none absolute left-0 top-0 whitespace-nowrap ${CLASS[kind]} ${kind === 'garden' ? '' : HALO}`;
    el.style.visibility = 'hidden';
    el.textContent = text;
    root.appendChild(el);
    anchors.push({ el, kind, v, priority, maxDistance, dy, w: 0, h: 0, on: false });
  };

  const largestByName = new Map<string, { m: Meta; h: number }>();
  data.campusBuildings.forEach((b, i) => {
    if (!b.props.name) return;
    const m = buildingMeta[i], cur = largestByName.get(b.props.name);
    if (!cur || m.area > cur.m.area) largestByName.set(b.props.name, { m, h: b.props.heightM ?? 8 });
  });
  for (const [name, { m, h }] of largestByName) add(shortName(name), 'building', new THREE.Vector3(m.x, WORLD_LIFT + h + ROOF_CLEARANCE_M, m.z), m.area + h * 400, h > 12 ? 1500 : 1050);
  data.greenAreas.forEach((s, i) => {
    if (s.props.name && s.props.name !== s.props.mapCode && !s.props.name.startsWith('AV-')) {
      add(s.props.name, 'garden', new THREE.Vector3(greenMeta[i].x, WORLD_LIFT + GARDEN_LABEL_M, greenMeta[i].z), greenMeta[i].area * 0.5, 700);
    }
  });
  data.gates.forEach((g) => add(g.props.name ?? 'Puerta', 'gate', new THREE.Vector3(g.p[0], WORLD_LIFT + GATE_LABEL_M, -g.p[1]), 1e9, 2200, 4));
  anchors.sort((a, b) => b.priority - a.priority);

  const projected = new THREE.Vector3();
  return {
    update(camera, width, height, visible) {
      const placed: [number, number, number, number][] = [];
      for (const a of anchors) {
        let show = false;
        if (visible(a.kind) && camera.position.distanceTo(a.v) < a.maxDistance) {
          projected.copy(a.v).project(camera);
          if (projected.z < 1 && projected.z > -1) {
            if (!a.w) { a.w = a.el.offsetWidth || 80; a.h = a.el.offsetHeight || 18; }
            const x = (projected.x * 0.5 + 0.5) * width - a.w / 2, y = (-projected.y * 0.5 + 0.5) * height - a.h - 2 - a.dy;
            const onScreen = x > -a.w && x < width && y > -a.h && y < height;
            const overlaps = placed.some((p) => x < p[2] + 4 && x + a.w + 4 > p[0] && y < p[3] + 2 && y + a.h + 2 > p[1]);
            if (onScreen && !overlaps) {
              placed.push([x, y, x + a.w, y + a.h]);
              a.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
              show = true;
            }
          }
        }
        if (show !== a.on) { a.el.style.visibility = show ? 'visible' : 'hidden'; a.on = show; }
      }
    },
    dispose: () => anchors.forEach((a) => a.el.remove()),
  };
}
