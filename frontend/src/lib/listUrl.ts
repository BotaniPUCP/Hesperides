/**
 * Conversión entre los filtros de un listado y su URL. La URL es la fuente de
 * verdad: por eso los filtros sobreviven a abrir una ficha, volver y recargar, y
 * un enlace sin parámetros, como los del menú lateral, deja la pantalla de cero.
 */
export type ListValues<K extends string> = Record<K, string>;

const MAX_PAGE = 2147483647;

export function readListValues<K extends string>(
  params: Pick<URLSearchParams, 'get'>,
  defaults: Readonly<ListValues<K>>,
): ListValues<K> {
  const keys = Object.keys(defaults) as K[];
  return Object.fromEntries(keys.map((key) => [key, params.get(key) ?? defaults[key]])) as ListValues<K>;
}

/** Omite los valores por defecto: la lista sin filtrar tiene una URL limpia. */
export function listQuery<K extends string>(values: Readonly<ListValues<K>>, defaults: Readonly<ListValues<K>>): string {
  const query = new URLSearchParams();
  for (const key of Object.keys(defaults) as K[]) {
    if (values[key] !== defaults[key]) query.set(key, values[key]);
  }
  return query.toString();
}

export function listHref<K extends string>(
  path: string,
  values: Readonly<ListValues<K>>,
  defaults: Readonly<ListValues<K>>,
): string {
  const query = listQuery(values, defaults);
  return query ? `${path}?${query}` : path;
}

/** La URL se puede editar a mano: lo que no sea una página válida es la primera. */
export function pageFrom(value: string): number {
  const page = /^\d+$/.test(value) ? Number(value) : 0;
  return page <= MAX_PAGE ? page : 0;
}

/** La URL se puede editar a mano: solo pasan los valores de una lista cerrada. */
export function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
