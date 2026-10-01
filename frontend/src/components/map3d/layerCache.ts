import type { MapLayersResponse } from '@shared/types';

/**
 * Copia local de las capas del mapa, guardada con la etiqueta (ETag) de la
 * versión de datos. Va en IndexedDB y no en localStorage porque las capas pesan
 * varios megabytes y localStorage suele cortar en cinco.
 */

export interface CachedLayers {
  etag: string | null;
  data: MapLayersResponse;
}

export interface LayerStore {
  /** La copia guardada, o null si nunca se descargó. */
  read: () => Promise<CachedLayers | null>;
  write: (entry: CachedLayers) => Promise<void>;
}

const DB_NAME = 'hesperides-mapa';
const STORE = 'capas';
const KEY = 'actual';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no está disponible en este navegador'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = action(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
      }).finally(() => db.close()),
  );
}

export const indexedDbLayerStore: LayerStore = {
  read: () => run<CachedLayers | undefined>('readonly', (s) => s.get(KEY)).then((entry) => entry ?? null),
  write: (entry) => run<IDBValidKey>('readwrite', (s) => s.put(entry, KEY)).then(() => undefined),
};
