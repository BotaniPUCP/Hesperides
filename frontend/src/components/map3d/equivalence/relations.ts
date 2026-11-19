export interface Relation { id: string; code: string; codes?: string[]; name?: string; mapIds: string[]; skpIds: string[]; note: string; updatedAt: string }
export const relationCodes = (r: Relation): string[] => r.codes ?? (r.code ? [r.code] : []);
export const relationTitle = (r: Relation): string => r.name?.trim() || relationCodes(r).join(', ');
export interface Manifest { origin: number[]; version: number; sourceHash: string; parts: { id: string; category: string; faceIndices: number[]; small: boolean; min: number[]; max: number[] }[] }
export interface RelationFile { version: 1 | 2; sourceHash: string; mapVersion: number; relations: Relation[] }
export function parseRelations(value: unknown, sourceHash: string, codes: Set<string>, mapIds: Set<string>, skpIds: Set<string>): RelationFile {
  const fail = () => { throw new Error('Archivo incompatible: revisa el SKP, los códigos y los identificadores de las estructuras.'); };
  if (!value || typeof value !== 'object') return fail();
  const data = value as RelationFile;
  const mergedCode = 'C06-C07';
  const legacy = (code: string) => codes.has(mergedCode) && (code === 'C06' || code === 'C07');
  if ((data.version !== 1 && data.version !== 2) || data.sourceHash !== sourceHash || !Number.isInteger(data.mapVersion) || !Array.isArray(data.relations) || data.relations.length > 10000) return fail();
  const seen = new Set<string>(), ids = new Set<string>();
  const validSelection = (v: unknown, allowed: Set<string>) => Array.isArray(v) && v.length <= allowed.size && v.every((id) => typeof id === 'string' && allowed.has(id)) && new Set(v).size === v.length;
  for (const r of data.relations) {
    if (!r || typeof r.id !== 'string' || !r.id || ids.has(r.id) || typeof r.code !== 'string' || (r.code !== '' && ((!codes.has(r.code) && !legacy(r.code)) || seen.has(r.code))) || !validSelection(r.mapIds, mapIds) || !validSelection(r.skpIds, skpIds) || (r.mapIds.length === 0 && r.skpIds.length === 0) || typeof r.note !== 'string' || r.note.length > (r.code === mergedCode ? 10000 : 2000) || typeof r.updatedAt !== 'string' || !Number.isFinite(Date.parse(r.updatedAt))) return fail();
    if (r.name !== undefined && (typeof r.name !== 'string' || r.name.length > 300)) return fail();
    const assigned = relationCodes(r);
    if (!Array.isArray(assigned) || (assigned.length ? assigned[0] !== r.code : r.code !== '' || !r.name?.trim()) || new Set(assigned).size !== assigned.length || assigned.some((code) => typeof code !== 'string' || (!codes.has(code) && !legacy(code)) || seen.has(code))) return fail();
    ids.add(r.id); assigned.forEach((code) => seen.add(code));
  }
  const relations: Relation[] = [];
  for (const r of data.relations) {
    const assigned = [...new Set(relationCodes(r).map((code) => legacy(code) ? mergedCode : code))];
    const code = assigned[0] ?? ''; 
    const existing = assigned.length === 1 && code === mergedCode ? relations.find((v) => v.code === code && relationCodes(v).length === 1) : undefined;
    if (existing) {
      existing.mapIds = [...new Set([...existing.mapIds, ...r.mapIds])];
      existing.skpIds = [...new Set([...existing.skpIds, ...r.skpIds])];
      if (!existing.name && r.name) existing.name = r.name;
      existing.note = [...new Set([existing.note, r.note].filter(Boolean))].join('\n');
      if (Date.parse(r.updatedAt) > Date.parse(existing.updatedAt)) existing.updatedAt = r.updatedAt;
    } else relations.push({ ...r, code, ...(r.codes ? { codes: assigned } : {}), mapIds: [...r.mapIds], skpIds: [...r.skpIds] });
  }
  return { version: 2, sourceHash, mapVersion: data.mapVersion, relations };
}
export function conflicts(relations: Relation[], mapIds: string[], skpIds: string[], editing: string | null) {
  return relations.filter((r) => r.id !== editing && (r.mapIds.some((id) => mapIds.includes(id)) || r.skpIds.some((id) => skpIds.includes(id))));
}
export const toggleId = (ids: string[], id: string) => ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id];
