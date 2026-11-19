import * as THREE from 'three';
import type { SceneData } from '../sceneData';
import type { Meta } from './geometry';
import type { PlanModel } from './planModel';
import { WORLD_LIFT } from './polyLayer';

/**
 * Etiquetas HTML sobre la escena (edificios, jardines con nombre y puertas), del
 * prototipo v39. Se colocan por prioridad y se ocultan si se pisan con otra.
 */

/** `landmark`: un lugar del plano, como la huaca; se ve como un jardín pero no se apaga con las áreas verdes. */
export type LabelKind = 'building' | 'garden' | 'gate' | 'landmark';

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

const GARDEN_CLASS = 'text-[11.5px] font-semibold text-[#E0FFE8] [text-shadow:0_0_3px_rgba(0,0,0,.7),0_1px_2px_rgba(0,0,0,.8)]';
const CLASS: Record<LabelKind, string> = {
  building: 'text-[12px] font-semibold text-[#5A1080]',
  garden: GARDEN_CLASS,
  gate: 'text-[11px] font-semibold text-[#5A6C99]',
  landmark: GARDEN_CLASS,
};
/** Alturas sobre el suelo de la maqueta, que está elevado WORLD_LIFT metros. */
const ROOF_CLEARANCE_M = 3;
const GARDEN_LABEL_M = 1.5;
const GATE_LABEL_M = 8.5;
/** La de la huaca va 2 m sobre lo más alto de sus muros, con la prioridad y el alcance de la página aprobada. */
const LANDMARK_LABEL_M = 2;
const LANDMARK_PRIORITY = 5e5;
const LANDMARK_MAX_DISTANCE_M = 1500;
const HALO = '[text-shadow:0_0_2px_#fff,0_0_3px_#fff,0_0_5px_#fff]';

/** «Facultad de Psicología» → «Psicología»: en la maqueta sobra el prefijo. */
export function shortName(name: string): string {
  return name.replace(/^Facultad de /, '').replace(/^Departamento de /, 'Depto. ').replace(/^Sección /, '').replace(/\s*\(.*\)\s*$/, '').trim();
}

/** Ancho máximo de una etiqueta; un nombre que entra completo puede llegar hasta la tolerancia. */
export const LABEL_MAX_PX = 160;
export const LABEL_TOLERANCE_PX = 190;
const CONNECTORS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'a', 'al', 'con', 'para', 'por']);
/** Abreviaturas de uso común en la PUCP; en un nombre en mayúsculas se escriben en mayúsculas. */
const ABBREVIATIONS: [RegExp, string][] = [
  [/\bestudios generales\b/i, 'EE.GG.'], [/\bdepartamento académico de\b/i, 'Dpto.'], [/\bdepartamento académico\b/i, 'Dpto.'],
  [/\bdepartamento de\b/i, 'Dpto.'], [/\bdepartamento\b/i, 'Dpto.'], [/\blaboratorio de\b/i, 'Lab.'], [/\blaboratorio\b/i, 'Lab.'],
  [/\binstituto de\b/i, 'Inst.'], [/\binstituto\b/i, 'Inst.'], [/\binvestigaci(ón|ones)\b/i, 'Inv.'], [/\bingeniería\b/i, 'Ing.'],
  [/\basociación\b/i, 'Asoc.'], [/\bservicios\b/i, 'Serv.'], [/\buniversitaria\b/i, 'Univ.'],
];

function abbreviate(text: string): string {
  const upper = text === text.toUpperCase();
  return ABBREVIATIONS.reduce((s, [re, ab]) => s.replace(re, upper ? ab.toUpperCase() : ab), text).replace(/\s+/g, ' ').trim();
}

/**
 * Acorta un nombre largo según el ancho medido (D-12): lo que cabe se queda; luego abreviaturas
 * (y el nombre abreviado entero si cabe en la tolerancia); la primera parte antes de un
 * separador; y por último palabras enteras con «…», sin dejar un conector colgando.
 */
export function trimLabel(text: string, measure: (t: string) => number): string {
  if (measure(text) <= LABEL_MAX_PX) return text;
  const abbreviated = abbreviate(text);
  if (measure(abbreviated) <= LABEL_TOLERANCE_PX) return abbreviated;
  const first = abbreviated.split(/\s+\/\s+|,\s+|:\s+|\s+[-+]\s+|\s+\(/)[0].trim();
  const split = first.length >= 6 && first !== abbreviated;
  if (split && measure(first) <= LABEL_MAX_PX) return first;
  const base = split ? first : abbreviated;
  const words = base.split(/\s+/);
  const cut = (limit: number): string[] => {
    const put: string[] = [];
    for (const w of words) {
      if (measure([...put, w].join(' ') + '…') > limit) break;
      put.push(w);
    }
    while (put.length > 1 && CONNECTORS.has(put[put.length - 1].toLowerCase())) put.pop();
    return put;
  };
  const significant = (ws: string[]) => ws.filter((w) => !CONNECTORS.has(w.toLowerCase())).length;
  let put = cut(LABEL_MAX_PX);
  if (significant(put) < 2) {
    if (measure(base) <= LABEL_TOLERANCE_PX) return base;
    put = cut(LABEL_TOLERANCE_PX);
  }
  let short = put.join(' ');
  if (!short) {
    short = words[0];
    while (short.length > 1 && measure(short + '…') > LABEL_MAX_PX) short = short.slice(0, -1);
  }
  return short.replace(/[\s,:;/+-]+$/, '') + '…';
}

/** La fuente con la que se dibuja la etiqueta; vacía si el navegador no la calcula (p. ej. jsdom). */
function drawnFont(el: HTMLElement): string {
  const cs = getComputedStyle(el);
  if (cs.font) return cs.font;
  if (!cs.fontSize || !cs.fontFamily) return '';
  return [cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily].filter(Boolean).join(' ');
}

/** Medidor de ancho con la fuente indicada; null si no hay canvas o fuente (p. ej. jsdom). */
function canvasMeasure(font: string): ((t: string) => number) | null {
  if (!font) return null;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return null;
    ctx.font = font;
    return (t) => ctx.measureText(t).width;
  } catch {
    return null;
  }
}

export interface Labels {
  update: (camera: THREE.Camera, width: number, height: number, visible: (kind: LabelKind) => boolean) => void;
  dispose: () => void;
}

export function createLabels(root: HTMLElement, data: SceneData, buildingMeta: Meta[], greenMeta: Meta[], huaca?: PlanModel['huaca'] | null): Labels {
  const anchors: Anchor[] = [];
  let disposed = false;
  const add = (text: string, kind: LabelKind, v: THREE.Vector3, priority: number, maxDistance: number, dy = 0) => {
    const el = document.createElement('div');
    el.className = `pointer-events-none absolute left-0 top-0 whitespace-nowrap ${CLASS[kind]} ${kind === 'garden' || kind === 'landmark' ? '' : HALO}`;
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
  if (huaca) {
    add(huaca.label, 'landmark', new THREE.Vector3(huaca.x, WORLD_LIFT + huaca.y + LANDMARK_LABEL_M, huaca.z), LANDMARK_PRIORITY, LANDMARK_MAX_DISTANCE_M);
  }
  anchors.sort((a, b) => b.priority - a.priority);

  // Con la fuente ya cargada se mide el ancho real; sin fuentes web ni canvas quedan los nombres completos.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(() => {
      if (disposed) return;
      // Se mide con la fuente con que se dibuja cada clase de etiqueta, no con una fija.
      const measures = new Map<LabelKind, ((t: string) => number) | null>();
      for (const a of anchors) {
        if (a.kind !== 'building' && a.kind !== 'garden') continue;
        if (!measures.has(a.kind)) measures.set(a.kind, canvasMeasure(drawnFont(a.el)));
        const measure = measures.get(a.kind);
        if (!measure) continue;
        const short = trimLabel(a.el.textContent ?? '', measure);
        if (short !== a.el.textContent) { a.el.textContent = short; a.w = 0; a.h = 0; }
      }
    }, () => {});
  }

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
    dispose: () => { disposed = true; anchors.forEach((a) => a.el.remove()); },
  };
}
