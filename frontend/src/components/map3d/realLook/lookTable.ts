import { SIDES, type BuildingLook, type FacePattern, type PhotoAtlas, type Side, type Zone, type ZoneSelector } from './types';
import { resolveFace } from './validateLook';

/**
 * La tabla que lee el shader: una fila por patrón de cara distinto, de
 * `ROW_TEXELS` texeles RGBA. Cada vértice de un edificio con ficha apunta a la
 * fila de su cara; el shader dibuja las ventanas con esos parámetros.
 */
export const ROW_TEXELS = 8;

/** Posición de cada parámetro dentro de la fila, en floats. */
export const TEXEL = {
  wall: 0, kind: 3, glass: 4, floorM: 7, frame: 8, sillM: 11, band: 12, windowM: 15,
  widthM: 16, moduleM: 17, offsetM: 18, frameM: 19, bandM: 20, startM: 21, groundRow: 22,
  plinth: 24, plinthM: 27, atlas: 28,
} as const;

/** Lo que la ficha omite: un edificio de aulas típico del campus. */
const DEFAULTS = { floorM: 3.2, sillM: 0.9, windowM: 1.5, widthM: 1.2, moduleM: 2.4, frameM: 0.06, glass: '#2a3540', frame: '#3a3a3a' };
const KIND_CODE = { blind: 0, windows: 1, ribbon: 2, curtain: 3, photo: 4 } as const;

export interface ZoneRows {
  where?: ZoneSelector;
  roof: number;
  sides: Record<Side, number>;
}

export interface LookTable {
  /** Floats RGBA, `rows` filas de `ROW_TEXELS` texeles. */
  data: Float32Array;
  rows: number;
  /** Por `plan_key`, las zonas en el orden de la ficha (la primera es la de por defecto). */
  zones: Map<string, ZoneRows[]>;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

type Row = number[];

function encode(p: FacePattern, plinth: Zone['plinth'], startM: number, groundRow: number, atlas: PhotoAtlas = {}): Row {
  const row = new Array<number>(ROW_TEXELS * 4).fill(0);
  const put = (at: number, hex: string) => row.splice(at, 3, ...hexToRgb(hex));
  put(TEXEL.wall, p.wall);
  put(TEXEL.glass, p.glass ?? DEFAULTS.glass);
  put(TEXEL.frame, p.frame ?? DEFAULTS.frame);
  put(TEXEL.band, p.band?.color ?? p.wall);
  put(TEXEL.plinth, plinth?.color ?? p.wall);
  row[TEXEL.kind] = KIND_CODE[p.kind];
  row[TEXEL.floorM] = p.floorM ?? DEFAULTS.floorM;
  row[TEXEL.sillM] = p.sillM ?? DEFAULTS.sillM;
  row[TEXEL.windowM] = p.windowM ?? DEFAULTS.windowM;
  row[TEXEL.widthM] = p.widthM ?? DEFAULTS.widthM;
  row[TEXEL.moduleM] = p.moduleM ?? DEFAULTS.moduleM;
  row[TEXEL.offsetM] = p.offsetM ?? 0;
  row[TEXEL.frameM] = p.frameM ?? DEFAULTS.frameM;
  row[TEXEL.bandM] = p.band?.heightM ?? 0;
  row[TEXEL.startM] = startM;
  row[TEXEL.groundRow] = groundRow;
  row[TEXEL.plinthM] = plinth?.heightM ?? 0;
  // En una cara de foto, el ancho del tramo va donde el de la ventana y su alto donde el del piso.
  if (p.photo) {
    row[TEXEL.widthM] = p.photo.widthM;
    row[TEXEL.floorM] = p.photo.heightM;
    row[TEXEL.moduleM] = p.photo.repeat === false ? 0 : 1;
    row[TEXEL.sillM] = -1;
    row.splice(TEXEL.atlas, 4, ...atlas[p.photo.tile]);
  }
  return row;
}

/** Junta filas iguales: muchas caras de un edificio comparten patrón. */
function rowStore() {
  const rows: Row[] = [];
  const index = new Map<string, number>();
  const add = (row: Row) => {
    const key = row.join(',');
    const found = index.get(key);
    if (found !== undefined) return found;
    rows.push(row);
    index.set(key, rows.length - 1);
    return rows.length - 1;
  };
  return { rows, add };
}

/** Un tramo de foto que no se repite apunta, en la casilla del alféizar, a la fila de lo que sigue fuera de él. */
function photoRow(add: (r: Row) => number, p: FacePattern, plinth: Zone['plinth'], start: number, groundRow: number, atlas: PhotoAtlas): number {
  const row = encode(p, plinth, start, groundRow, atlas);
  if (p.photo?.beyond) row[TEXEL.sillM] = add(encode(p.photo.beyond, plinth, p.photo.beyond.startM ?? 0, -1, atlas));
  return add(row);
}

function faceRow(add: (r: Row) => number, p: FacePattern, plinth: Zone['plinth'], atlas: PhotoAtlas): number {
  const start = p.startM ?? 0;
  if (!p.ground) return photoRow(add, p, plinth, start, -1, atlas);
  const { heightM, ...ground } = p.ground;
  const groundRow = add(encode({ ...ground, floorM: ground.floorM ?? heightM }, plinth, start, -1, atlas));
  return photoRow(add, p, plinth, start + heightM, groundRow, atlas);
}

/** Las fichas ya validadas, llevadas a filas; `atlas` ubica los tramos de foto. */
export function buildLookTable(looks: BuildingLook[], atlas: PhotoAtlas = {}): LookTable {
  const store = rowStore();
  const zones = new Map<string, ZoneRows[]>();
  for (const look of looks) {
    zones.set(look.planKey, look.zones.map((zone) => {
      const sides = Object.fromEntries(SIDES.map((side) => [side, faceRow(store.add, resolveFace(look.planKey, zone, side), zone.plinth, atlas)])) as Record<Side, number>;
      const roof = store.add(encode({ kind: 'blind', wall: zone.roof }, undefined, 0, -1));
      return { where: zone.where, roof, sides };
    }));
  }
  if (!store.rows.length) store.add(encode({ kind: 'blind', wall: '#ffffff' }, undefined, 0, -1));
  const data = new Float32Array(store.rows.length * ROW_TEXELS * 4);
  store.rows.forEach((row, i) => data.set(row, i * ROW_TEXELS * 4));
  return { data, rows: store.rows.length, zones };
}
