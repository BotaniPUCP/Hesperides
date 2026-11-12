'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import { toSceneData } from '@/components/map3d/sceneData';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';

/**
 * El campus en 3D con unas secciones iluminadas y la cámara encuadrándolas. Sin
 * secciones no hay realce y la cámara se queda donde está, para no saltar mientras
 * llega la siguiente lista.
 */
export function SectionsFocusMap({ codes }: { codes: string[] }) {
  const { data: layers, isLoading, errorMessage } = useMapLayers();
  const [unsupported, setUnsupported] = useState(false);
  const viewer = useRef<Viewer | null>(null);

  const scene = useMemo(() => {
    if (!layers) return null;
    try { return toSceneData(layers); } catch { return null; }
  }, [layers]);

  useEffect(() => {
    viewer.current?.setMarkedSections(codes);
    viewer.current?.focusSections(codes);
  }, [codes]);

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
        onReady={(v) => { viewer.current = v; v.setMarkedSections(codes); v.focusSections(codes); v.setLayerVisible('supervision', false); }}
        onUnsupported={() => setUnsupported(true)}
        onSelect={() => undefined} onGroundPick={() => undefined} onHover={() => undefined} onCompass={() => undefined} />
      <div className="pointer-events-none absolute bottom-2 left-3"><MapAttribution required={layers.attributionRequired} /></div>
    </div>
  );
}
