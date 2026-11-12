'use client';

import { useEffect, useState } from 'react';
import type { BuildingModelManifest } from '@shared/types';
import type { LocalPlane } from '@/components/map3d/projection';
import type { PlanModel } from '@/components/map3d/viewer/planModel';
import { mapApi } from '@/lib/map-api';

export interface UsePlanModelResult {
  model: PlanModel | null;
  /** El modelo no se pudo descargar o leer: el mapa sigue con los prismas (SPEC-108 §5.2, CA-13). */
  failed: boolean;
}

const PENDING: UsePlanModelResult = { model: null, failed: false };

/**
 * El último modelo leído en esta sesión, con la versión de su manifiesto y el
 * origen del plano en que se ubicó. Solo vive en memoria: la próxima visita al
 * mapa abre ya con él, sin el cambio de prismas a modelos, y solo se vuelve a
 * descargar si cambió la versión.
 */
let lastRead: { origin: string; version: string; model: PlanModel } | null = null;

/** Cada visita arma su plano: se comparan por su origen. */
function originOf(plane: LocalPlane): string {
  return plane.toLatLon({ x: 0, y: 0 }).join(',');
}

function readFor(plane: LocalPlane): PlanModel | null {
  return lastRead?.origin === originOf(plane) ? lastRead.model : null;
}

async function download(manifest: Promise<BuildingModelManifest>, plane: LocalPlane, origin: string): Promise<PlanModel> {
  const [m, glb, { parsePlanModel }] = await Promise.all([
    manifest,
    mapApi.buildingModel().then((blob) => blob.arrayBuffer()),
    // Como el visor: three y su lector de GLB se cargan solo en la pantalla del mapa.
    import('@/components/map3d/viewer/planModel'),
  ]);
  const model = await parsePlanModel(m, glb, plane);
  lastRead = { origin, version: m.version, model };
  return model;
}

async function loadPlanModel(plane: LocalPlane): Promise<PlanModel> {
  const origin = originOf(plane);
  const known = lastRead?.origin === origin ? lastRead : null;
  const manifest = mapApi.buildingModelManifest();
  if (!known) return download(manifest, plane, origin);
  // Sin poder preguntar la versión (sin red, sesión vencida), sigue el que ya se leyó en esta sesión.
  const version = await manifest.then((m) => m.version, () => known.version);
  return version === known.version ? known.model : download(manifest, plane, origin);
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

  if (!plane) return PENDING;
  if (state.plane === plane) return { model: state.model, failed: state.failed };
  const read = readFor(plane);
  return read ? { model: read, failed: false } : PENDING;
}
