import type { BuildingModelManifest, MapLayersResponse } from '@shared/types';
import { toSceneData } from '../sceneData';

/** The public viewer downloads immutable scene assets without a session or map API calls. */
export async function loadDemoScene(signal: AbortSignal) {
  const [{ default: snapshot }, { default: plan }] = await Promise.all([
    import('./campus.json'),
    import('./plan.json'),
  ]);
  const data = toSceneData(snapshot as MapLayersResponse);
  const [response, { parsePlanModel }] = await Promise.all([
    fetch(plan.url, { signal, credentials: 'omit' }),
    import('../viewer/planModel'),
  ]);
  if (!response.ok || !response.body) throw new Error('No se pudo descargar el modelo 3D.');
  const bytes = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  return {
    data,
    attributionRequired: snapshot.attributionRequired,
    model: await parsePlanModel(plan.manifest as unknown as BuildingModelManifest, bytes, data.plane),
  };
}
