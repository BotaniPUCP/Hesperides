/**
 * Una página de una lista ya filtrada en el navegador (SPEC-119). Si el filtro deja menos filas
 * que antes, la página pedida puede quedar fuera: se muestra la última que existe.
 */
export function pageOf<T>(items: T[], page: number, size: number): { rows: T[]; page: number } {
  const lastPage = Math.max(0, Math.ceil(items.length / size) - 1);
  const current = Math.min(Math.max(0, page), lastPage);
  return { rows: items.slice(current * size, (current + 1) * size), page: current };
}
