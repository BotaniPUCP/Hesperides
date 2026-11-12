'use client';

import { useEffect, useState } from 'react';
import type { LocalPlane } from '@/components/map3d/projection';
import type { PlanModel } from '@/components/map3d/viewer/planModel';
import { mapApi } from '@/lib/map-api';

export interface UsePlanModelResult {
  model: PlanModel | null;
  /** El modelo no se pudo descargar o leer: el mapa sigue con los prismas (SPEC-108 §5.2, CA-13). */
  failed: boolean;
}

const PENDING: UsePlanModelResult = { model: null, failed: false };

async function loadPlanModel(plane: LocalPlane): Promise<PlanModel> {
  const [manifest, glb, { parsePlanModel }] = await Promise.all([
    mapApi.buildingModelManifest(),
    mapApi.buildingModel().then((blob) => blob.arrayBuffer()),
    // Como el visor: three y su lector de GLB se cargan solo en la pantalla del mapa.
    import('@/components/map3d/viewer/planModel'),
  ]);
  return parsePlanModel(manifest, glb, plane);
}

/**
 * El modelo de los edificios del plano, con el manifiesto y el GLB que sirve
 * el backend con sesión (D-06), ubicado en el plano de las capas. Nunca lanza:
 * una sesión vencida, un 404 o un 500, la red o un archivo ilegible terminan en
 * `failed`, y el mapa se dibuja como hoy.
 */
export function usePlanModel(plane: LocalPlane | null): UsePlanModelResult {
  // Se guarda con su plano: un resultado de otro plano no se entrega.
  const [state, setState] = useState<{ plane: LocalPlane | null } & UsePlanModelResult>({ plane: null, ...PENDING });

  useEffect(() => {
    if (!plane) return;
    let current = true;
    loadPlanModel(plane)
      .then((model) => current && setState({ plane, model, failed: false }))
      .catch(() => current && setState({ plane, model: null, failed: true }));
    return () => {
      current = false;
    };
  }, [plane]);

  return plane && state.plane === plane ? { model: state.model, failed: state.failed } : PENDING;
}
