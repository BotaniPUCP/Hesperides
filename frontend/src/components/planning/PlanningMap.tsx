'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import { toSceneData } from '@/components/map3d/sceneData';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';
import { useRequest } from '@/hooks/useRequest';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';

/** El campus con los jardines y ejemplares del conjunto elegido iluminados; sin conjunto, sin realce (SPEC-203 §7). */
export function PlanningMap({ setId }: { setId: number | null }) {
  const { data: layers, isLoading, errorMessage } = useMapLayers();
  const [unsupported, setUnsupported] = useState(false);
  const viewer = useRef<Viewer | null>(null);
  const set = useRequest(setId ? `planning-map-set:${setId}` : null, () => greenAreaSetsApi.get(setId!));
  const codes = useMemo(() => (setId && set.data ? set.data.zones.map((z) => z.code) : []), [setId, set.data]);
  const specimenCodes = useMemo(() => (setId && set.data ? set.data.elements.map((e) => e.code) : []), [setId, set.data]);

  const scene = useMemo(() => {
    if (!layers) return null;
    try { return toSceneData(layers); } catch { return null; }
  }, [layers]);

  // Al cambiar de conjunto el mapa viaja hasta él; sin conjunto se queda donde está, para no saltar mientras carga el siguiente.
  useEffect(() => {
    viewer.current?.setMarkedSections(codes);
    viewer.current?.setMarkedSpecimens(specimenCodes);
    viewer.current?.focusSections(codes, specimenCodes);
  }, [codes, specimenCodes]);

  if (isLoading) return <LoadingSkeleton className="h-full min-h-[320px] w-full" />;
  if (!scene || !layers || unsupported) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-neutral-100 p-6 text-center text-sm text-neutral-500">
        {errorMessage ?? 'El mapa 3D no está disponible en este navegador.'}
      </div>
    );
  }
  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-lg bg-neutral-100 lg:h-full">
      <Map3DView data={scene}
        onReady={(v) => { viewer.current = v; v.setMarkedSections(codes); v.setMarkedSpecimens(specimenCodes); v.focusSections(codes, specimenCodes); v.setLayerVisible('supervision', false); }}
        onUnsupported={() => setUnsupported(true)}
        onSelect={() => undefined} onGroundPick={() => undefined} onHover={() => undefined} onCompass={() => undefined} />
      <div className="pointer-events-none absolute bottom-2 left-3"><MapAttribution required={layers.attributionRequired} /></div>
    </div>
  );
}
