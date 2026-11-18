/**
 * Aviso de que el backend guardó algo (SPEC-119 D-03). Lo emite `api.ts` tras cada escritura
 * exitosa; las listas precargadas lo escuchan para recargarse. Vive aparte para que `api.ts`
 * no dependa de quién escucha.
 */

type WriteListener = (path: string) => void;

const listeners = new Set<WriteListener>();

export function onWrite(listener: WriteListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyWrite(path: string): void {
  for (const listener of listeners) listener(path);
}
