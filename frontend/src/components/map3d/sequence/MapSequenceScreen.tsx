'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMapLayers } from '@/hooks/useMapLayers';
import { usePlanModel } from '@/hooks/usePlanModel';
import { Map3DView } from '../Map3DView';
import { initialVisibility } from '../layerList';
import { INITIAL_OPTIONS } from '../mapScreenMemory';
import { applyToViewer } from '../restoreMapScreen';
import { toSceneData } from '../sceneData';
import type { Viewer, ViewerStart } from '../viewer/createViewer';
import { cameraPoseAt } from './sequencePath';
import { playSequence } from './sequencePlayer';
import { SWAP_AT_S } from './sequenceTimeline';

/**
 * La secuencia de SPEC-118 a pantalla completa: el mapa sin interfaz, una toma de
 * 12 s que pasa de poca a buena calidad. Espacio la arranca; Esc vuelve al mapa.
 */

type Phase = 'loading' | 'preparing' | 'ready' | 'playing' | 'done' | 'failed';

/** Cuánto se deja dibujando la buena calidad bajo el velo: compila shaders y carga la ciudad y las nubes (§6.4). */
const PREWARM_GOOD_MS = 3000;
const PREWARM_LOW_MS = 600;
const VIEWER_START: ViewerStart = { realColors: INITIAL_OPTIONS.realColors };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function prepare(viewer: Viewer, alive: () => boolean): Promise<void> {
  applyToViewer(viewer, { mode: 'base', hidden: new Set(), visible: initialVisibility(), options: INITIAL_OPTIONS });
  viewer.setLabels(false);
  viewer.setCaptureMode(true);
  viewer.setSequence(true);
  viewer.setSequenceLook('good');
  viewer.setPoseNow(cameraPoseAt(SWAP_AT_S));
  await wait(PREWARM_GOOD_MS);
  if (!alive()) return;
  viewer.setSequenceLook('low');
  viewer.setPoseNow(cameraPoseAt(0));
  await wait(PREWARM_LOW_MS);
}

const VEIL_TEXT: Partial<Record<Phase, string>> = {
  loading: 'Cargando el mapa…',
  preparing: 'Preparando…',
  ready: 'Pulsa espacio para empezar · Esc para salir',
  failed: 'Este navegador no puede mostrar el mapa 3D. Esc para salir.',
};

export function MapSequenceScreen() {
  const router = useRouter();
  const { data: response, errorMessage } = useMapLayers();
  const data = useMemo(() => {
    try { return response ? toSceneData(response) : null; } catch { return null; }
  }, [response]);
  const plan = usePlanModel(data?.plane ?? null);
  const [phase, setPhase] = useState<Phase>('loading');
  const viewer = useRef<Viewer | null>(null);
  const effects = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const stop = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; stop.current?.(); }, []);

  const onReady = useCallback((v: Viewer) => {
    viewer.current = v;
    setPhase('preparing');
    void prepare(v, () => mounted.current).then(() => { if (mounted.current) setPhase('ready'); });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { router.push('/mapa'); return; }
      if (e.key !== ' ' || (phase !== 'ready' && phase !== 'done')) return;
      e.preventDefault();
      const v = viewer.current;
      if (!v || !effects.current || !overlay.current) return;
      stop.current?.();
      setPhase('playing');
      stop.current = playSequence(v, { effects: effects.current, overlay: overlay.current }, () => setPhase('done'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, router]);

  const modelSettled = plan.model !== null || plan.failed;
  const veil = !data && errorMessage ? `No se pudo cargar el mapa. ${errorMessage}` : VEIL_TEXT[phase];
  return (
    <div className={`fixed inset-0 overflow-hidden bg-black ${phase === 'playing' || phase === 'done' ? 'cursor-none' : ''}`}>
      <div ref={effects} className="absolute inset-0 will-change-[filter,transform]">
        {data && modelSettled && (
          <Map3DView data={data} model={plan.model} start={VIEWER_START} bare onReady={onReady}
            onUnsupported={() => setPhase('failed')} onSelect={() => undefined} onGroundPick={() => undefined}
            onHover={() => undefined} onCompass={() => undefined} />
        )}
        <div ref={overlay} className="pointer-events-none absolute inset-0" style={{ opacity: 0 }} />
      </div>
      {veil && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 text-lg text-white" role="status">
          {veil}
        </div>
      )}
    </div>
  );
}
