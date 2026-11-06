/**
 * Últimos filtros de cada listado, para que el breadcrumb y la flecha de una
 * ficha regresen a la lista como estaba. Vive en sessionStorage porque solo vale
 * para esta pestaña; si el navegador lo bloquea, se regresa a la lista sin filtros.
 */
const KEY_PREFIX = 'hesperides.listQuery:';

const keyFor = (path: string) => `${KEY_PREFIX}${path}`;

export function rememberListQuery(path: string, query: string): void {
  try {
    if (query) window.sessionStorage.setItem(keyFor(path), query);
    else window.sessionStorage.removeItem(keyFor(path));
  } catch {
    // Recordar es una comodidad: sin almacenamiento la pantalla sigue funcionando.
    return;
  }
}

export function rememberedHref(path: string): string {
  try {
    const query = window.sessionStorage.getItem(keyFor(path));
    return query ? `${path}?${query}` : path;
  } catch {
    return path;
  }
}
