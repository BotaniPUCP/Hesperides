import { mensajeDeApiError } from '@/lib/api-errors';
import { onWrite } from '@/lib/writeEvents';

/**
 * Listas que se cargan una vez al abrir la pantalla que las usa y se filtran en el navegador
 * (SPEC-119). Mientras alguien la tiene abierta, solo se vuelve a pedir si se guarda algo
 * relacionado (D-03); al abrirla de nuevo se pide otra vez (D-04).
 */

export interface PreloadedState<T> {
  items: T[];
  /** Ya llegó al menos una respuesta desde que se abrió o desde el último cierre de sesión. */
  loaded: boolean;
  loading: boolean;
  errorMessage: string | null;
}

export interface PreloadedList<T> {
  readonly name: string;
  subscribe: (listener: () => void) => () => void;
  snapshot: () => PreloadedState<T>;
  open: () => void;
  close: () => void;
  reload: () => void;
}

/** POST que solo calculan o descargan: no cambian ninguna lista. */
const READ_ONLY_WRITES = [/\/preview$/, /\/confirmation-summary$/, /^\/places\/export/, /^\/map\/describe/];

const INITIAL = { items: [], loaded: false, loading: false, errorMessage: null };

interface Resettable {
  reset: () => void;
}

const registry = new Set<Resettable>();

export function definePreloadedList<T>(
  name: string,
  load: () => Promise<T[]>,
  affectedBy: RegExp[],
): PreloadedList<T> {
  let state: PreloadedState<T> = INITIAL;
  let openCount = 0;
  let requestId = 0;
  let inFlight = false;
  const listeners = new Set<() => void>();

  function set(next: Partial<PreloadedState<T>>) {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  }

  function reload() {
    const id = ++requestId;
    inFlight = true;
    set({ loading: true });
    load()
      .then((items) => {
        if (id !== requestId) return;
        inFlight = false;
        set({ items, loaded: true, loading: false, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (id !== requestId) return;
        inFlight = false;
        set({ loading: false, errorMessage: mensajeDeApiError(error) });
      });
  }

  onWrite((path) => {
    const route = path.split('?')[0];
    if (openCount === 0 || READ_ONLY_WRITES.some((r) => r.test(route))) return;
    if (affectedBy.some((r) => r.test(route))) reload();
  });

  registry.add({
    reset() {
      requestId++;
      inFlight = false;
      set(INITIAL);
    },
  });

  return {
    name,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => state,
    open() {
      openCount++;
      // Si ya hay una petición en vuelo (otro buscador de la misma pantalla, o el doble montaje
      // de React en desarrollo), se comparte en vez de repetirla.
      if (!inFlight) reload();
    },
    close() {
      openCount = Math.max(0, openCount - 1);
    },
    reload,
  };
}

/** Al cerrar sesión: lo cargado dependía de lo que podía ver ese usuario (D-05). */
export function resetPreloadedLists(): void {
  for (const list of registry) list.reset();
}
