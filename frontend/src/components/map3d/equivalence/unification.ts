import type { SceneData } from '../sceneData';
import type { Manifest, Relation } from './relations';
import { relationCodes } from './relations';
import codes from './codes.json';
import references from './building-references.json';
interface BuildingReference { name?: string; aliases: string[]; floors?: { floor: string; places: string[] }[] }
const referenceByCode: Record<string, BuildingReference> = references;
export const normalizeSearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
export function entryMatches(entry: UnifiedEntry, query: string) {
  const text = normalizeSearch([entry.name, ...entry.aliases, ...entry.codes, ...entry.mapIds, ...entry.skpIds, ...entry.floors.flatMap((f) => f.places)].join(' '));
  const term = normalizeSearch(query.trim());
  return /^[a-z0-9]{2,5}$/.test(term) ? text.split(/[^a-z0-9]+/).includes(term) : text.includes(term);
}


export const exceptions = {
  leftOnly: '249a8c11-620a-48d6-98aa-df74d1f90f69',
  kiosk: 'b9a4a553-9c25-45f2-b2fc-43592ab2b917',
  template: 'C-3446',
};
export interface UnifiedEntry { id: string; name: string; source: 'SKP' | 'Mapa izquierdo' | 'Forma SKP / medidas izquierdas'; mapIds: string[]; skpIds: string[]; codes: string[]; aliases: string[]; floors: { floor: string; places: string[] }[]; parentId?: string }
export function unifiedEntries(data: SceneData, relations: Relation[]): UnifiedEntry[] {
  const entries: UnifiedEntry[] = relations.map((r) => {
    const assigned = relationCodes(r);
    const inherited = [...new Set(data.campusBuildings.filter((b) => r.mapIds.includes(String(b.props.id))).map((b) => b.props.name?.trim()).filter(Boolean))].join(' / ');
    const metadata = assigned.map((code) => referenceByCode[code]).filter(Boolean);
    const override = metadata.find((m) => m.name)?.name;
    const name = override || (assigned.includes('62') ? 'Instituto de Ciencias Ómicas y Biotecnología Aplicada' : r.mapIds.includes('22') ? 'Aulas Móviles A' : r.name?.trim() || inherited || codes.filter((c) => assigned.includes(c.code)).map((c) => c.label).join(' / ') || 'Sin nombre');
    return { id: r.id, name, mapIds: r.mapIds, skpIds: [...r.skpIds], codes: assigned, aliases: [...new Set(metadata.flatMap((m) => m.aliases))], floors: metadata.flatMap((m) => m.floors ?? []), source: r.id === exceptions.kiosk ? 'Forma SKP / medidas izquierdas' : r.id === exceptions.leftOnly || !r.skpIds.length ? 'Mapa izquierdo' : 'SKP' };
  });
  // Split only the unified view; preserve the original correspondence for alignment.
  const parent = entries.find((e) => e.codes.includes('39'));
  const detached = ['C-161', 'C-1970'];
  if (parent && detached.every((id) => parent.skpIds.includes(id))) {
    parent.skpIds = parent.skpIds.filter((id) => !detached.includes(id));
    entries.push({ id: 'unified:lugar-prestado', name: 'Lugar prestado', source: 'SKP', skpIds: detached, mapIds: [], codes: [], aliases: ['Caseta junto a Maestranza'], floors: [], parentId: parent.id });
  }
  return entries;
}
export interface Anchor { id: string; from: [number, number]; to: [number, number] }
export function rigidAlignment(anchors: Anchor[]) {
  if (anchors.length < 3) throw new Error('Se necesitan al menos tres correspondencias para alinear los mapas.');
  const avg = (key: 'from' | 'to', i: number) => anchors.reduce((sum, a) => sum + a[key][i], 0) / anchors.length;
  const fx = avg('from', 0), fz = avg('from', 1), tx = avg('to', 0), tz = avg('to', 1);
  let dot = 0, cross = 0;
  for (const a of anchors) { const x = a.from[0] - fx, z = a.from[1] - fz, u = a.to[0] - tx, v = a.to[1] - tz; dot += x * u + z * v; cross += x * v - z * u; }
  const angle = Math.atan2(cross, dot), c = Math.cos(angle), s = Math.sin(angle);
  const dx = tx - c * fx + s * fz, dz = tz - s * fx - c * fz;
  const residuals = anchors.map((a) => ({ id: a.id, metres: Math.hypot(c * a.from[0] - s * a.from[1] + dx - a.to[0], s * a.from[0] + c * a.from[1] + dz - a.to[1]) }));
  const sorted = residuals.map((r) => r.metres).sort((a, b) => a - b);
  return { c, s, dx, dz, angle, scale: 1, reflected: false, residuals, median: sorted[Math.floor(sorted.length / 2)], p90: sorted[Math.floor(sorted.length * .9)], max: sorted[sorted.length - 1] };
}
export function alignmentFor(data: SceneData, manifest: Manifest, relations: Relation[]) {
  const anchors: Anchor[] = [];
  for (const r of relations) {
    if (!r.mapIds.length || !r.skpIds.length || r.id === exceptions.leftOnly) continue;
    const points = data.campusBuildings.filter((b) => r.mapIds.includes(String(b.props.id))).flatMap((b) => b.g.flatMap((p) => Array.from({ length: p[0].length / 2 }, (_, i) => [p[0][i * 2], -p[0][i * 2 + 1]])));
    const parts = manifest.parts.filter((p) => r.skpIds.includes(p.id));
    if (!points.length || !parts.length) continue;
    anchors.push({ id: r.id, from: [0, 2].map((i) => (Math.min(...parts.map((p) => p.min[i])) + Math.max(...parts.map((p) => p.max[i]))) / 2) as [number, number], to: [0, 1].map((i) => (Math.min(...points.map((p) => p[i])) + Math.max(...points.map((p) => p[i]))) / 2) as [number, number] });
  }
  return rigidAlignment(anchors);
}
