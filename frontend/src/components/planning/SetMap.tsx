'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import { toSceneData } from '@/components/map3d/sceneData';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';
import { contentsLabel } from './planningTexts';
import { setClusters, type SetCluster } from './setClusters';

const CHIP = 'pointer-events-auto rounded-md bg-neutral-0 text-xs font-semibold text-neutral-900 shadow';

interface Props {
  zoneCodes: string[];
  specimenCodes: string[];
  className?: string;
}

/**
 * Un conjunto en el mapa, con lo suyo iluminado. Si está disperso, se recorre por
 * grupos de cosas cercanas (Anterior · Siguiente · Ver todo) en vez de encuadrar
 * todo el campus. No toca el visor: solo lo encuadra.
 */
export function SetMap({ zoneCodes, specimenCodes, className = '' }: Props) {
  const { data: layers, isLoading, errorMessage } = useMapLayers();
  const [unsupported, setUnsupported] = useState(false);
  const viewer = useRef<Viewer | null>(null);
  const scene = useMemo(() => {
    if (!layers) return null;
    try { return toSceneData(layers); } catch { return null; }
  }, [layers]);
  const clusters = useMemo(() => (scene ? setClusters(scene, zoneCodes, specimenCodes) : []), [scene, zoneCodes, specimenCodes]);
  // -1: todo el conjunto; 0..n-1: un grupo. Al cambiar de conjunto se vuelve al primero.
  const key = `${zoneCodes.join(',')}|${specimenCodes.join(',')}`;
  const [step, setStep] = useState<{ key: string; index: number }>({ key, index: 0 });
  const index = step.key === key ? step.index : 0;
  const focus: SetCluster = useMemo(() => (clusters.length > 1 && index >= 0 ? clusters[index] : { zoneCodes, specimenCodes }),
    [clusters, index, zoneCodes, specimenCodes]);

  useEffect(() => {
    viewer.current?.setMarkedSections(zoneCodes);
    viewer.current?.setMarkedSpecimens(specimenCodes);
  }, [zoneCodes, specimenCodes]);
  useEffect(() => { viewer.current?.focusSections(focus.zoneCodes, focus.specimenCodes); }, [focus]);

  if (isLoading) return <LoadingSkeleton className={`h-full min-h-[320px] w-full ${className}`} />;
  if (!scene || !layers || unsupported) {
    return (
      <div className={`flex min-h-[320px] items-center justify-center rounded-lg bg-neutral-100 p-6 text-center text-sm text-neutral-500 ${className}`}>
        {errorMessage ?? 'El mapa 3D no está disponible en este navegador.'}
      </div>
    );
  }
  const go = (i: number) => setStep({ key, index: i });
  return (
    <div className={`relative min-h-[320px] overflow-hidden rounded-lg bg-neutral-100 ${className}`}>
      <Map3DView data={scene}
        onReady={(v) => {
          viewer.current = v; v.setMarkedSections(zoneCodes); v.setMarkedSpecimens(specimenCodes);
          v.focusSections(focus.zoneCodes, focus.specimenCodes); v.setLayerVisible('supervision', false);
        }}
        onUnsupported={() => setUnsupported(true)}
        onSelect={() => undefined} onGroundPick={() => undefined} onHover={() => undefined} onCompass={() => undefined} />
      {clusters.length > 1 && (
        <div role="group" aria-label="Recorrer el conjunto por grupos" className={`${CHIP} absolute left-3 right-3 top-3 z-30 flex w-fit max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 py-1 pl-3 pr-1`}>
          <span aria-live="polite" className="whitespace-nowrap pr-2">
            {index < 0 ? `Todo · ${clusters.length} grupos` : `Grupo ${index + 1} de ${clusters.length} · ${contentsLabel(focus.zoneCodes.length, focus.specimenCodes.length)}`}
          </span>
          <button type="button" className="whitespace-nowrap rounded px-2 py-1 hover:bg-neutral-100" disabled={index <= 0}
            onClick={() => go(Math.max(0, index - 1))}>‹ Anterior</button>
          <button type="button" className="whitespace-nowrap rounded px-2 py-1 hover:bg-neutral-100" disabled={index >= clusters.length - 1}
            onClick={() => go(index < 0 ? 0 : index + 1)}>Siguiente ›</button>
          <button type="button" className="whitespace-nowrap rounded px-2 py-1 hover:bg-neutral-100" aria-pressed={index < 0}
            onClick={() => go(index < 0 ? 0 : -1)}>{index < 0 ? 'Por grupos' : 'Ver todo'}</button>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-3"><MapAttribution required={layers.attributionRequired} /></div>
    </div>
  );
}
