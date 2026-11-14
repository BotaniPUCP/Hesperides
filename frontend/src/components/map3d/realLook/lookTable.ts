import { faceRegions } from './faceRegions';
import { DEFAULT_FRAME_M, KIND_GLASS, KIND_SOLID, NO_BOUND_M, TABLE_WIDTH } from './lookLayout';
import { SIDES, type BuildingLook, type Material, type Region, type Side, type ZoneSelector } from './types';
import { isGlass } from './validateLook';

/**
 * La tabla que lee el shader (disposición en `lookLayout.ts`). Cada vértice de
 * un edificio con ficha apunta al texel de su cara; la cara dice su muro y su
 * lista de regiones, y cada región su material.
 */

export interface ZoneRows {
  where?: ZoneSelector;
  /** Texel de la cara de techo de la zona. */
  roof: number;
  sides: Record<Side, number>;
}

export interface LookTable {
  /** Floats RGBA de `width` × `height` texeles. */
  data: Float32Array;
  width: number;
  height: number;
  /** Texeles usados. */
  texels: number;
  /** Por `plan_key`, las zonas en el orden de la ficha (la primera es la de por defecto). */
  zones: Map<string, ZoneRows[]>;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const NONE = [0, 0, 0];

function materialRecord(m: Material): number[] {
  if (!isGlass(m)) return [...hexToRgb(m.color), KIND_SOLID, ...new Array(16).fill(0)];
  return [
    ...hexToRgb(m.glass), KIND_GLASS,
    ...hexToRgb(m.frame), m.frameM ?? DEFAULT_FRAME_M,
    ...(m.spandrel ? hexToRgb(m.spandrel.color) : NONE), m.spandrel?.heightM ?? 0,
    ...(m.accent ? hexToRgb(m.accent.color) : NONE), m.accent?.share ?? 0,
    m.moduleM, m.heightM, m.vary ?? 0, 0,
  ];
}

const bounds = (range?: [number, number]) => range ?? [-NO_BOUND_M, NO_BOUND_M];

function regionRecord(r: Region, material: number): number[] {
  const f = r.floors;
  const floors = f ? [f.everyM, (f.startM ?? 0) + (f.bandM[0] + f.bandM[1]) / 2, (f.bandM[1] - f.bandM[0]) / 2] : NONE;
  return [...bounds(r.u), ...bounds(r.v), material, ...floors];
}

/** Una semilla por cara: dos caras con las mismas regiones no reparten igual sus acentos. */
function faceSeed(...parts: string[]): number {
  let h = 2166136261;
  for (const ch of parts.join('/')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % 997;
}

/** Texeles en orden; lo que se repite (un material, una lista de regiones) se guarda una sola vez. */
function texelStore() {
  const texels: number[] = [];
  const index = new Map<string, number>();
  const add = (kind: string, record: number[]) => {
    const key = `${kind}:${record.join(',')}`;
    const found = index.get(key);
    if (found !== undefined) return found;
    index.set(key, texels.length / 4);
    texels.push(...record);
    return index.get(key)!;
  };
  return { texels, add };
}

function lookZones(look: BuildingLook, add: ReturnType<typeof texelStore>['add']): ZoneRows[] {
  const material = (name: string) => add('m', materialRecord(look.materials[name]));
  const face = (regions: Region[], wall: string, seed: number) => {
    const list = regions.flatMap((r) => regionRecord(r, material(r.material)));
    return add('f', [material(wall), list.length ? add('r', list) : 0, regions.length, seed]);
  };
  return look.zones.map((zone) => ({
    where: zone.where,
    roof: face([], zone.roof, 0),
    sides: Object.fromEntries(SIDES.map((side) => [side, face(faceRegions(zone, side), zone.wall, faceSeed(look.planKey, zone.id, side))])) as Record<Side, number>,
  }));
}

/** Las fichas ya validadas, llevadas a la tabla. */
export function buildLookTable(looks: BuildingLook[]): LookTable {
  const store = texelStore();
  const zones = new Map(looks.map((look) => [look.planKey, lookZones(look, store.add)]));
  const used = store.texels.length / 4;
  const height = Math.max(1, Math.ceil(used / TABLE_WIDTH));
  const data = new Float32Array(TABLE_WIDTH * height * 4);
  data.set(store.texels);
  return { data, width: TABLE_WIDTH, height, texels: used, zones };
}
