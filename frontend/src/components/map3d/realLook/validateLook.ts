import { FaceCopyError, faceRegions } from './faceRegions';
import { MAX_REGIONS } from './lookLayout';
import { SIDES, type BuildingLook, type GlassMaterial, type Material, type Region, type Side, type Zone } from './types';

/** Una ficha mal escrita: se detiene la carga con un mensaje que dice cuál y por qué. */
export class LookError extends Error {
  constructor(planKey: string, detail: string) {
    super(`Ficha de apariencia ${planKey}: ${detail}`);
    this.name = 'LookError';
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/;
type Range = readonly [number, number];
/** Rangos de un edificio: una medida fuera de ellos es un error de tipeo (SPEC-112 D-10). */
const MODULE_M: Range = [0.6, 6];
const GLASS_HEIGHT_M: Range = [1, 6];
const FRAME_M: Range = [0.01, 0.3];
const FLOOR_M: Range = [2.4, 6];
const VARY: Range = [0, 0.2];
const ACCENT_SHARE: Range = [0, 0.5];
/** Una franja por piso más angosta sería una columna de ventanas: el sello que no debe volver (D-03). */
const MIN_FLOOR_BAND_WIDTH_M = 4;

const inRange = (value: number, [min, max]: Range) => value >= min && value <= max;
const span = ([min, max]: Range) => `de ${min} a ${max}`.replace(/\./g, ',');
export const isGlass = (m: Material): m is GlassMaterial => 'glass' in m;

function checkColor(key: string, where: string, value: string) {
  if (!HEX.test(value)) throw new LookError(key, `${where}: «${value}» no es un color #rrggbb`);
}

function checkGlass(key: string, where: string, m: GlassMaterial) {
  [m.glass, m.frame, m.spandrel?.color, m.accent?.color].forEach((c) => c !== undefined && checkColor(key, where, c));
  if (!inRange(m.moduleM, MODULE_M)) throw new LookError(key, `${where}: el ancho del módulo debe ir ${span(MODULE_M)} m`);
  if (!inRange(m.heightM, GLASS_HEIGHT_M)) throw new LookError(key, `${where}: el alto del módulo debe ir ${span(GLASS_HEIGHT_M)} m`);
  if (m.frameM !== undefined && !inRange(m.frameM, FRAME_M)) throw new LookError(key, `${where}: el grosor de los perfiles debe ir ${span(FRAME_M)} m`);
  if (m.spandrel && !(m.spandrel.heightM > 0 && m.spandrel.heightM < m.heightM)) throw new LookError(key, `${where}: el antepecho no cabe en el módulo`);
  if (m.vary !== undefined && !inRange(m.vary, VARY)) throw new LookError(key, `${where}: la variación de tono debe ir ${span(VARY)}`);
  if (m.accent && !(m.accent.share > 0 && inRange(m.accent.share, ACCENT_SHARE))) {
    throw new LookError(key, `${where}: el acento debe ir en una proporción mayor que 0 y hasta ${ACCENT_SHARE[1]}`.replace('.', ','));
  }
}

function checkMaterial(key: string, name: string, m: Material) {
  const where = `material ${name}`;
  if (isGlass(m)) checkGlass(key, where, m);
  else checkColor(key, where, m.color);
}

function checkSpan(key: string, where: string, axis: 'u' | 'v', range: [number, number] | undefined) {
  if (range && !(range[0] < range[1])) throw new LookError(key, `${where}: el tramo de ${axis} va de menor a mayor`);
}

function checkRegion(key: string, where: string, region: Region, look: BuildingLook) {
  if (!look.materials[region.material]) throw new LookError(key, `${where}: el material «${region.material}» no está en la ficha`);
  checkSpan(key, where, 'u', region.u);
  checkSpan(key, where, 'v', region.v);
  const floors = region.floors;
  if (!floors) return;
  if (!inRange(floors.everyM, FLOOR_M)) throw new LookError(key, `${where}: el alto de piso debe ir ${span(FLOOR_M)} m`);
  const [from, to] = floors.bandM;
  if (!(from < to && to - from < floors.everyM)) throw new LookError(key, `${where}: la franja no cabe en su piso`);
  if (region.u && region.u[1] - region.u[0] < MIN_FLOOR_BAND_WIDTH_M) {
    throw new LookError(key, `${where}: una franja por piso mide al menos ${MIN_FLOOR_BAND_WIDTH_M} m de ancho`);
  }
}

function checkFaceRule(key: string, zone: Zone, side: string, look: BuildingLook) {
  const where = `zona ${zone.id}, cara ${side}`;
  if (!(SIDES as readonly string[]).includes(side)) throw new LookError(key, `zona ${zone.id}: «${side}» no es una orientación`);
  const rule = zone.faces![side as Side]!;
  if (Array.isArray(rule)) {
    if (!rule.length) throw new LookError(key, `${where}: una lista de regiones vacía no pinta nada; se quita la entrada`);
    rule.forEach((region) => checkRegion(key, where, region, look));
  } else if (!rule.why?.trim()) {
    throw new LookError(key, `${where}: la copia debe decir por qué es evidente`);
  }
}

/** Lo que pinta cada orientación: que las copias terminen y que no pasen del máximo de regiones. */
function checkPainted(key: string, zone: Zone) {
  for (const side of SIDES) {
    const where = `zona ${zone.id}, cara ${side}`;
    let painted: Region[];
    try {
      painted = faceRegions(zone, side);
    } catch (copyError) {
      // El detalle lo escribe faceRegions en español; aquí solo se le agrega la ficha, la zona y la cara.
      if (copyError instanceof FaceCopyError) throw new LookError(key, `${where}: ${copyError.message}`);
      throw copyError;
    }
    if (painted.length > MAX_REGIONS) throw new LookError(key, `${where}: pinta ${painted.length} regiones y el máximo es ${MAX_REGIONS}`);
  }
}

function checkZone(key: string, zone: Zone, first: boolean, look: BuildingLook) {
  if (first && zone.where) throw new LookError(key, `la primera zona (${zone.id}) es la de por defecto y no lleva selector`);
  if (!first && !zone.where) throw new LookError(key, `la zona ${zone.id} necesita un selector`);
  if (!look.materials[zone.wall]) throw new LookError(key, `zona ${zone.id}: el muro «${zone.wall}» no está en la ficha`);
  const roof = look.materials[zone.roof];
  if (!roof || isGlass(roof)) throw new LookError(key, `zona ${zone.id}: el techo debe ser un material liso de la ficha`);
  (zone.common ?? []).forEach((region) => checkRegion(key, `zona ${zone.id}, regiones comunes`, region, look));
  Object.keys(zone.faces ?? {}).forEach((side) => checkFaceRule(key, zone, side, look));
  checkPainted(key, zone);
}

function checkLook(look: BuildingLook, planKeys: Set<string>) {
  const key = look.planKey;
  if (!planKeys.has(key)) throw new LookError(key, 'el edificio no está en el modelo');
  if (!((look.folder && look.photos?.length) || look.source)) throw new LookError(key, 'no cita fotos ni otra fuente de la que salga');
  if (!look.zones.length) throw new LookError(key, 'no tiene zonas');
  Object.entries(look.materials).forEach(([name, m]) => checkMaterial(key, name, m));
  look.zones.forEach((zone, i) => checkZone(key, zone, i === 0, look));
}

/** Revisa todas las fichas contra los edificios del modelo; la primera falla detiene todo. */
export function validateLooks(looks: BuildingLook[], planKeys: Set<string>): void {
  const seen = new Set<string>();
  for (const look of looks) {
    if (seen.has(look.planKey)) throw new LookError(look.planKey, 'ficha repetida');
    seen.add(look.planKey);
    checkLook(look, planKeys);
  }
}
