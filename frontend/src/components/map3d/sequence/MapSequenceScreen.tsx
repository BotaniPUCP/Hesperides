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
import { useSequenceExport } from './useSequenceExport';

/**
 * La secuencia de SPEC-118 a pantalla completa: el mapa sin interfaz, una toma de
 * 12 s que pasa de poca a buena calidad. Espacio la arranca; Esc vuelve al mapa.
 */

type Phase = 'loading' | 'preparing' | 'ready' | 'playing' | 'done' | 'exporting' | 'failed' | 'broken';

/** Cuánto se deja dibujando la buena calidad bajo el velo: compila shaders y carga la ciudad y las nubes (§6.4). */
const PREWARM_GOOD_MS = 3000;
const PREWARM_LOW_MS = 600;
const VIEWER_START: ViewerStart = { realColors: INITIAL_OPTIONS.realColors };
/** El logo de §9: la pixelada se amplía sin suavizar. */
const LOGO_SRC = { pixel: '/secuencia/hesperides-pixelado.png', original: '/secuencia/hesperides-original.png' } as const;
const LOGO_CLASS = 'pointer-events-none absolute max-w-none select-none';

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
  ready: 'Espacio para verla · E para exportar MP4 · Esc para salir',
  failed: 'Este navegador no puede mostrar el mapa 3D. Esc para salir.',
  broken: 'No se pudo preparar la secuencia; el detalle está en la consola. Recarga la página.',
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
  const pixelLogo = useRef<HTMLImageElement>(null);
  const originalLogo = useRef<HTMLImageElement>(null);
  const logos = () => (pixelLogo.current && originalLogo.current
    ? { pixel: pixelLogo.current, original: originalLogo.current } : undefined);
  const stop = useRef<(() => void) | null>(null);
  const exporter = useSequenceExport();
  const [notice, setNotice] = useState<string | null>(null);
  // En desarrollo React monta, desmonta y vuelve a montar: la bandera se repone en cada montaje.
  const mounted = useRef(false);
  /** Cada visor nuevo arranca su propia preparación; solo cuenta la última. */
  const generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop.current?.(); };
  }, []);

  const onReady = useCallback((v: Viewer) => {
    viewer.current = v;
    setPhase('preparing');
    const run = ++generation.current;
    const alive = () => mounted.current && generation.current === run;
    prepare(v, alive).then(() => { if (alive()) setPhase('ready'); }, (error: unknown) => {
      console.error('SPEC-118: la preparación de la secuencia falló', error);
      if (alive()) setPhase('broken');
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (phase === 'exporting') exporter.cancel(); else router.push('/mapa'); return; }
      const v = viewer.current;
      if ((phase !== 'ready' && phase !== 'done') || !v || !effects.current || !overlay.current) return;
      if (e.key === ' ') {
        e.preventDefault();
        stop.current?.();
        setPhase('playing');
        stop.current = playSequence(v, { effects: effects.current, overlay: overlay.current, logos: logos() }, () => setPhase('done'));
      } else if (e.key.toLowerCase() === 'e') {
        stop.current?.();
        setNotice(null);
        setPhase('exporting');
        void exporter.start(v, logos()).then((failure) => { setNotice(failure); setPhase('ready'); });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, router, exporter]);

  const modelSettled = plan.model !== null || plan.failed;
  const exporting = phase === 'exporting' ? `Exportando… ${exporter.percent ?? 0} % · Esc para cancelar` : null;
  const veil = !data && errorMessage ? `No se pudo cargar el mapa. ${errorMessage}` : exporting ?? VEIL_TEXT[phase];
  return (
    <div className={`fixed inset-0 overflow-hidden bg-black ${phase === 'playing' || phase === 'done' ? 'cursor-none' : ''}`}>
      <div ref={effects} className="absolute inset-0 will-change-[filter,transform]">
        {data && modelSettled && (
          <Map3DView data={data} model={plan.model} start={VIEWER_START} bare onReady={onReady}
            onUnsupported={() => setPhase('failed')} onSelect={() => undefined} onGroundPick={() => undefined}
            onHover={() => undefined} onCompass={() => undefined} />
        )}
        <div ref={overlay} className="pointer-events-none absolute inset-0" style={{ opacity: 0 }} />
        {/* eslint-disable-next-line @next/next/no-img-element -- se mueve cuadro a cuadro y el video lo dibuja tal cual */}
        <img ref={pixelLogo} src={LOGO_SRC.pixel} alt="" className={LOGO_CLASS} style={{ display: 'none', imageRendering: 'pixelated' }} />
        {/* eslint-disable-next-line @next/next/no-img-element -- ídem */}
        <img ref={originalLogo} src={LOGO_SRC.original} alt="" className={LOGO_CLASS} style={{ display: 'none' }} />
      </div>
      {veil && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 text-lg text-white" role="status">
          <p className="max-w-xl text-center">
            {veil}
            {notice && phase === 'ready' && <span className="mt-3 block text-base text-red-300">{notice}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
