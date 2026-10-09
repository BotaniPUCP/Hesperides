import type { SceneData } from './sceneData';
import type { LayerId, Target } from './target';

/** Un lugar o una perspectiva del catálogo de lugares: no son capas del visor. */
export interface CatalogTarget {
  layer: 'catalogPlace' | 'catalogPerspective';
  index: number;
}

export type SearchTarget = Target | CatalogTarget;

export const isCatalogTarget = (t: SearchTarget): t is CatalogTarget =>
  t.layer === 'catalogPlace' || t.layer === 'catalogPerspective';

/** Una fila del buscador del mapa. `key` es el texto normalizado sobre el que se busca. */
export interface SearchEntry {
  title: string;
  subtitle: string;
  terms: string;
  key: string;
  target: SearchTarget;
  /** Desempata a igual coincidencia: las referencias y los edificios antes que el resto. */
  priority: number;
}

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 9;

/** Sin tildes ni mayúsculas: el personal escribe «fisica», no «Física». */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function entry(title: string, subtitle: string, terms: string, layer: LayerId, index: number, priority = 0): SearchEntry {
  return { title, subtitle, terms, key: normalize(`${title} ${subtitle} ${terms}`), target: { layer, index }, priority };
}

type IndexSource = Pick<
  SceneData,
  'campusBuildings' | 'greenAreas' | 'xerophytic' | 'reserve' | 'supervision' | 'gates' | 'bins' | 'fountains' | 'references' | 'sectorNameByCode'
> &
  Partial<Pick<SceneData, 'vegetation'>>;

export function buildSearchIndex(data: IndexSource): SearchEntry[] {
  const out: SearchEntry[] = [];
  data.campusBuildings.forEach((b, i) => {
    if (!b.props.name) return;
    out.push(entry(b.props.name, b.props.category ?? 'Edificio', (b.props.aliases ?? []).join(' '), 'campusBuildings', i, 1));
  });
  data.greenAreas.forEach((s, i) => {
    const sector = s.props.parentCode ? data.sectorNameByCode[s.props.parentCode] : null;
    const subtitle = ['Área verde', s.props.mapCode, sector].filter(Boolean).join(', ');
    out.push(entry(s.props.name, subtitle, s.props.code, 'greenAreas', i));
  });
  data.xerophytic.forEach((s, i) => out.push(entry(s.props.name, 'Jardín xerofítico', s.props.code, 'xerophytic', i)));
  data.reserve.forEach((s, i) => out.push(entry(s.props.name, 'Jardín de reserva', s.props.code, 'reserve', i)));
  data.supervision.forEach((z, i) => out.push(entry(z.props.name, 'Zona de supervisión', z.props.code, 'supervision', i)));
  data.gates.forEach((g, i) => out.push(entry(g.props.name ?? 'Puerta', 'Puerta de acceso', g.props.code ?? '', 'gates', i)));
  data.bins.forEach((b, i) => out.push(entry('Tacho', b.props.name ?? '', b.props.code ?? '', 'bins', i)));
  data.fountains.forEach((f, i) => out.push(entry('Bebedero', f.props.name ?? '', f.props.code ?? '', 'fountains', i)));
  out.push(...referenceEntries(data.references));
  // Una planta se busca solo por su código: por especie saldrían cientos de
  // resultados iguales que taparían los lugares (para eso está el inventario).
  (data.vegetation ?? []).forEach((v, i) =>
    out.push({ ...entry(v.props.code, v.props.commonName ?? v.props.scientificName, '', 'vegetation', i), key: normalize(v.props.code) }),
  );
  return out;
}

/**
 * La lista oficial marca un mismo lugar con varios puntos (Tinkuy tiene once a
 * pocos metros): se buscan como uno solo, que lleva al primero. Los homónimos
 * en lugares distintos («Cuarto piso») se distinguen por su lugar padre.
 */
function referenceEntries(references: IndexSource['references']): SearchEntry[] {
  const nameByCode = new Map(references.map((r) => [r.props.code, r.props.name]));
  const seen = new Set<string>();
  const out: SearchEntry[] = [];
  references.forEach((r, i) => {
    const parent = r.props.parentCode ? nameByCode.get(r.props.parentCode) : undefined;
    const subtitle = parent ? `${r.props.category} · ${parent}` : r.props.category;
    const place = normalize(`${r.props.name}|${subtitle}`);
    if (seen.has(place)) return;
    seen.add(place);
    out.push(entry(r.props.name, subtitle, (r.props.aliases ?? []).join(' '), 'references', i, 2));
  });
  return out;
}

export function search(index: SearchEntry[], query: string): SearchEntry[] {
  const q = normalize(query.trim());
  if (q.length < MIN_QUERY_LENGTH) return [];
  const terms = q.split(/\s+/);
  const rank = (e: SearchEntry) => {
    const title = normalize(e.title);
    if (title === q) return 0;
    if (title.startsWith(q)) return 1;
    return title.startsWith(terms[0]) ? 2 : 3;
  };
  return index
    .filter((e) => terms.every((t) => e.key.includes(t)))
    .sort((a, b) => rank(a) - rank(b) || b.priority - a.priority || a.title.length - b.title.length)
    .slice(0, MAX_RESULTS);
}
