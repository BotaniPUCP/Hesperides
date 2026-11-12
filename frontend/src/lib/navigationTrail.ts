/**
 * Recorrido de pantallas de esta visita, del que sale el destino de la flecha de
 * volver. No se usa history.back(): tras Lista → Ficha → breadcrumb → Lista, el
 * historial devolvería a la Ficha y la flecha rebotaría entre las dos. Vive en
 * memoria: al recargar se pierde y la flecha usa la pantalla padre.
 */
type Trail = readonly string[];

let trail: Trail = [];
const listeners = new Set<() => void>();

export function advanceTrail(current: Trail, path: string): Trail {
  if (current.at(-1) === path) return current;
  if (current.at(-2) === path) return current.slice(0, -1);
  return [...current, path];
}

function publish(next: Trail): void {
  if (next === trail) return;
  trail = next;
  listeners.forEach((listener) => listener());
}

export function recordVisit(path: string): void {
  publish(advanceTrail(trail, path));
}

/** Entrar por el menú lateral empieza de cero: no hay a dónde volver. */
export function restartTrail(path: string): void {
  publish([path]);
}

export function previousPath(): string | null {
  return trail.at(-2) ?? null;
}

export function subscribeToTrail(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
