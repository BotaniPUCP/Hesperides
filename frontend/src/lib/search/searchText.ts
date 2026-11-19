/**
 * Búsqueda en memoria sobre listas precargadas (SPEC-119 D-02): «contiene», sin tildes ni
 * mayúsculas, como el `unaccent(lower(…)) LIKE '%texto%'` que hacía el backend.
 */

const COMBINING_MARKS = /\p{M}/gu;
/** Guiones y rayas tipográficos: unaccent los convierte en «-». */
const DASHES = /[‐-―]/g;

/** Lo mismo que hace `unaccent(lower(btrim(…)))` en PostgreSQL con texto en español. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').replace(DASHES, '-').toLowerCase().trim();
}

/**
 * `searchKey` ya viene normalizado del backend; se normaliza de nuevo por si una lista lo arma
 * en el frontend. `includes` busca `%` y `_` como texto, igual que `LikePattern` al escaparlos.
 */
export function matches(searchKey: string, query: string): boolean {
  const wanted = normalize(query);
  return wanted === '' || normalize(searchKey).includes(wanted);
}

export interface Searchable {
  searchKey: string;
}

/** Con texto vacío devuelve la misma lista, para no crear una copia en cada render. */
export function filterByText<T extends Searchable>(items: T[], query: string): T[] {
  const wanted = normalize(query);
  if (wanted === '') return items;
  return items.filter((item) => normalize(item.searchKey).includes(wanted));
}
