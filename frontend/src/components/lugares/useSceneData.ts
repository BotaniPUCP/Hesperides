'use client';

import { useMemo } from 'react';
import { toSceneData, type SceneData } from '@/components/map3d/sceneData';
import { useMapLayers } from '@/hooks/useMapLayers';

/** Las capas del mapa ya proyectadas para el visor; null si no llegaron o vinieron incompletas. */
export function useSceneData(): { data: SceneData | null; isLoading: boolean } {
  const { data: response, isLoading } = useMapLayers();
  const data = useMemo(() => {
    try {
      return response ? toSceneData(response) : null;
    } catch {
      return null;
    }
  }, [response]);
  return { data, isLoading };
}
