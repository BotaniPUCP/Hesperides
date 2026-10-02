'use client';

import { useEffect, useState } from 'react';
import type { MapLayersResponse } from '@shared/types';
import { indexedDbLayerStore, type CachedLayers, type LayerStore } from '@/components/map3d/layerCache';
import { missingLayers } from '@/components/map3d/sceneData';
import { mensajeDeApiError } from '@/lib/api-errors';
import { mapApi } from '@/lib/map-api';

export interface UseMapLayersResult {
  data: MapLayersResponse | null;
  isLoading: boolean;
  errorMessage: string | null;
  /** Se muestra la copia local porque no se pudo preguntar al servidor: puede estar desactualizada. */
  stale: boolean;
}

/**
 * Las capas del mapa: la base de datos es la única fuente, y el navegador
 * guarda una copia por versión (SPEC-102 §5.1). Cada apertura pregunta al
 * servidor con la etiqueta de esa copia; si nada cambió, la respuesta es un 304
 * sin cuerpo y se dibuja la copia.
 */
export function useMapLayers(store: LayerStore = indexedDbLayerStore): UseMapLayersResult {
  const [state, setState] = useState<UseMapLayersResult>({ data: null, isLoading: true, errorMessage: null, stale: false });

  useEffect(() => {
    let current = true;

    // Una copia ilegible (modo privado, cuota agotada) no impide abrir el
    // mapa: se descarga como si fuera la primera vez.
    // Una copia de un formato anterior (sin una capa que hoy existe) tampoco
    // sirve: se descarta aunque su etiqueta coincida.
    const cached = store
      .read()
      .catch((): CachedLayers | null => null)
      .then((copy) => (copy && missingLayers(copy.data).length === 0 ? copy : null));

    cached
      .then(async (copy) => {
        const result = await mapApi.layers(copy?.etag ?? null);
        if (!result.changed) {
          if (copy) return copy.data;
          throw new Error('El servidor respondió «sin cambios» sin que exista una copia local');
        }
        // Guardar la copia es una mejora, no un requisito: si falla, el mapa
        // se dibuja igual y la próxima apertura vuelve a descargar.
        store.write({ etag: result.etag, data: result.data }).catch(() => undefined);
        return result.data;
      })
      .then((data) => current && setState({ data, isLoading: false, errorMessage: null, stale: false }))
      .catch(async (error: unknown) => {
        const copy = await cached;
        if (!current) return;
        // Sin red se trabaja con la última versión descargada: en campo la
        // cobertura es irregular y el mapa no cambia de un día a otro.
        setState(
          copy
            ? { data: copy.data, isLoading: false, errorMessage: null, stale: true }
            : { data: null, isLoading: false, errorMessage: mensajeDeApiError(error), stale: false },
        );
      });

    return () => {
      current = false;
    };
  }, [store]);

  return state;
}
