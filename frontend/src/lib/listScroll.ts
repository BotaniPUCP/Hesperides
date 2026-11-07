/**
 * Última posición del scroll de cada listado, para encontrarlo igual al regresar
 * de una ficha. Guarda también sus filtros: una posición solo tiene sentido sobre
 * la misma lista. Si el navegador bloquea el almacenamiento, no se recuerda.
 */
export interface ListScroll {
  query: string;
  top: number;
}

const KEY_PREFIX = 'hesperides.listScroll:';

const keyFor = (path: string) => `${KEY_PREFIX}${path}`;

function isListScroll(value: unknown): value is ListScroll {
  if (typeof value !== 'object' || value === null) return false;
  const { query, top } = value as Partial<ListScroll>;
  return typeof query === 'string' && typeof top === 'number' && top >= 0;
}

export function saveListScroll(path: string, query: string, top: number): void {
  try {
    window.sessionStorage.setItem(keyFor(path), JSON.stringify({ query, top }));
  } catch {
    // Recordar es una comodidad: sin almacenamiento la pantalla sigue funcionando.
    return;
  }
}

export function readListScroll(path: string): ListScroll | null {
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(keyFor(path)) ?? 'null');
    return isListScroll(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function forgetListScroll(path: string): void {
  try {
    window.sessionStorage.removeItem(keyFor(path));
  } catch {
    return;
  }
}
