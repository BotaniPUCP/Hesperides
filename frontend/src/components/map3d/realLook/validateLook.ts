import { PATTERN_KINDS, SIDES, type BuildingLook, type FaceKey, type FacePattern, type FaceRule, type PhotoAtlas, type Zone } from './types';

/** Una ficha mal escrita: se detiene la carga con un mensaje que dice cuál y por qué. */
export class LookError extends Error {
  constructor(planKey: string, detail: string) {
    super(`Ficha de apariencia ${planKey}: ${detail}`);
    this.name = 'LookError';
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const FACE_KEYS: readonly FaceKey[] = [...SIDES, 'other'];
const LENGTHS = ['floorM', 'sillM', 'windowM', 'widthM', 'moduleM', 'frameM'] as const;

const isSameAs = (rule: FaceRule): rule is { sameAs: FaceKey } => 'sameAs' in rule;

function checkColor(key: string, where: string, value: string | undefined) {
  if (value !== undefined && !HEX.test(value)) throw new LookError(key, `${where}: «${value}» no es un color #rrggbb`);
}

function checkPhoto(key: string, where: string, p: FacePattern, atlas: PhotoAtlas) {
  if (p.kind !== 'photo') return;
  if (!p.photo) throw new LookError(key, `${where}: una cara «photo» necesita su tramo`);
  if (!atlas[p.photo.tile]) throw new LookError(key, `${where}: el tramo «${p.photo.tile}» no está en el atlas`);
  if (!(p.photo.widthM > 0 && p.photo.heightM > 0)) throw new LookError(key, `${where}: el tramo debe tener ancho y alto positivos`);
}

function checkPattern(key: string, where: string, p: FacePattern, atlas: PhotoAtlas) {
  if (!PATTERN_KINDS.includes(p.kind)) throw new LookError(key, `${where}: tipo de patrón desconocido «${p.kind}»`);
  checkPhoto(key, where, p, atlas);
  [p.wall, p.glass, p.frame, p.band?.color].forEach((c) => checkColor(key, where, c));
  for (const name of LENGTHS) {
    const v = p[name];
    if (v !== undefined && !(v > 0)) throw new LookError(key, `${where}: ${name} debe ser una medida positiva`);
  }
  if (p.band && !(p.band.heightM > 0)) throw new LookError(key, `${where}: el canto de losa debe tener alto positivo`);
  const floor = p.floorM ?? Infinity;
  if ((p.sillM ?? 0) + (p.windowM ?? 0) > floor) throw new LookError(key, `${where}: alféizar más ventana no caben en el piso`);
  if (p.kind === 'windows' && (p.widthM ?? 0) > (p.moduleM ?? Infinity)) throw new LookError(key, `${where}: la ventana es más ancha que su módulo`);
  if (p.ground) {
    if (!(p.ground.heightM > 0)) throw new LookError(key, `${where}: el primer piso debe tener alto positivo`);
    if (p.ground.ground) throw new LookError(key, `${where}: el primer piso no puede tener otro primer piso`);
    checkPattern(key, `${where} (primer piso)`, p.ground, atlas);
  }
}

/** Sigue las copias de una cara hasta un patrón; falla si apunta a la nada o da la vuelta. */
export function resolveFace(key: string, zone: Zone, face: FaceKey): FacePattern {
  const seen = new Set<FaceKey>();
  let current: FaceKey = face;
  for (;;) {
    const rule: FaceRule | undefined = zone.faces[current] ?? (current === 'other' ? undefined : zone.faces.other);
    if (!rule) throw new LookError(key, `zona ${zone.id}: la cara ${current} no existe`);
    if (!isSameAs(rule)) return rule;
    if (seen.has(current)) throw new LookError(key, `zona ${zone.id}: copia circular entre caras (${[...seen].join(' → ')})`);
    seen.add(current);
    if (!zone.faces[rule.sameAs]) throw new LookError(key, `zona ${zone.id}: la cara ${current} copia a ${rule.sameAs}, que no existe`);
    current = rule.sameAs;
  }
}

function checkZone(key: string, zone: Zone, first: boolean, atlas: PhotoAtlas) {
  if (first && zone.where) throw new LookError(key, `la primera zona (${zone.id}) es la de por defecto y no lleva selector`);
  if (!first && !zone.where) throw new LookError(key, `la zona ${zone.id} necesita un selector`);
  checkColor(key, `zona ${zone.id}, techo`, zone.roof);
  checkColor(key, `zona ${zone.id}, zócalo`, zone.plinth?.color);
  if (!zone.faces.other) throw new LookError(key, `zona ${zone.id}: falta la cara «other»`);
  for (const face of FACE_KEYS) {
    const rule = zone.faces[face];
    if (rule && !isSameAs(rule)) checkPattern(key, `zona ${zone.id}, cara ${face}`, rule, atlas);
    if (rule) resolveFace(key, zone, face);
  }
}

/** Revisa todas las fichas contra los edificios del modelo y el atlas de fotos; la primera falla detiene todo. */
export function validateLooks(looks: BuildingLook[], planKeys: Set<string>, atlas: PhotoAtlas = {}): void {
  const seen = new Set<string>();
  for (const look of looks) {
    if (seen.has(look.planKey)) throw new LookError(look.planKey, 'ficha repetida');
    seen.add(look.planKey);
    if (!planKeys.has(look.planKey)) throw new LookError(look.planKey, 'el edificio no está en el modelo');
    if (!look.zones.length) throw new LookError(look.planKey, 'no tiene zonas');
    look.zones.forEach((zone, i) => checkZone(look.planKey, zone, i === 0, atlas));
  }
}
