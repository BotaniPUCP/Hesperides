'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import { toSceneData } from '@/components/map3d/sceneData';
import type { Viewer } from '@/components/map3d/viewer/viewerTypes';
import { useMapLayers } from '@/hooks/useMapLayers';

export function IrrigationCoverageMap({ colors }: { colors: ReadonlyMap<string, string> }) {
  const { data: layers, isLoading, errorMessage, stale } = useMapLayers();
  const [unsupported, setUnsupported] = useState(false);
  const viewer = useRef<Viewer | null>(null);
  const scene = useMemo(() => {
    if (!layers) return null;
    try { return toSceneData(layers); } catch { return null; }
  }, [layers]);

  useEffect(() => { viewer.current?.setSectionColors(colors); }, [colors]);

  if (isLoading) return <LoadingSkeleton />;
  if (!scene || unsupported) {
    return <p className="text-sm text-neutral-600">{errorMessage ?? 'Mapa 3D no disponible. Consulta el estado en la lista.'}</p>;
  }

  return <div className="relative h-96 overflow-hidden rounded-lg border border-neutral-200">
    <Map3DView
      data={scene}
      onReady={(nextViewer) => {
        viewer.current = nextViewer;
        nextViewer.setSectionColors(colors);
        nextViewer.setLayerVisible('supervision', false);
        nextViewer.top();
      }}
      onUnsupported={() => setUnsupported(true)}
      onSelect={() => undefined}
      onGroundPick={() => undefined}
      onHover={() => undefined}
      onCompass={() => undefined}
    />
    {stale && <p className="pointer-events-none absolute bottom-8 left-2 text-sm text-alert-warning-fg">Geometría del mapa almacenada sin conexión.</p>}
    <div className="pointer-events-none absolute bottom-2 left-2"><MapAttribution required={layers?.attributionRequired ?? false} /></div>
  </div>;
}
