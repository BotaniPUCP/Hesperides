'use client';

import { useEffect, useRef } from 'react';
import type { SceneData } from './sceneData';
import type { CameraPose } from './viewer/cameraRig';
import type { Viewer, ViewerCallbacks, ViewerStart } from './viewer/createViewer';
import type { PlanModel } from './viewer/planModel';
import type { SweepKind } from './viewer/selectionSweep';
import type { Target } from './target';

/** Guarda la vista entre montajes, para que la cámara no vuelva al encuadre inicial. */
export interface PoseMemory {
  recall: () => CameraPose | undefined;
  remember: (pose: CameraPose) => void;
}

export interface Map3DViewProps extends ViewerCallbacks {
  data: SceneData;
  /** Los edificios del plano oficial; sin él, prismas. Cuando llega, el visor se vuelve a armar con él (la cámara se conserva). */
  model?: PlanModel | null;
  onReady: (viewer: Viewer) => void;
  /** El navegador no pudo crear el contexto WebGL: quien llama muestra las listas. */
  onUnsupported: () => void;
  poseMemory?: PoseMemory;
  /** Cómo nace el visor; se lee solo al crearlo. Sin él, en colores reales. */
  start?: ViewerStart;
  /** Modo captura: sin nombres ni globos sobre la maqueta. */
  bare?: boolean;
}

/** Todo mapa nace en colores reales (SPEC-112 D-13): el rosado queda solo para quien lo pida. */
const REAL_COLORS_START: ViewerStart = { realColors: true };

/**
 * Monta el visor de three.js en un div. El visor se importa al montar y no
 * arriba del archivo: three pesa ~600 kB y no tiene sentido en el servidor ni
 * en las pantallas que no muestran el mapa.
 */
export function Map3DView({ data, model = null, onReady, onUnsupported, poseMemory, start = REAL_COLORS_START, bare = false, ...callbacks }: Map3DViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const balloons = useRef<HTMLDivElement>(null);
  // Los callbacks cambian en cada render del padre; el visor se crea una sola
  // vez, así que lee siempre los más recientes a través de esta referencia.
  const latest = useRef({ ...callbacks, onReady, onUnsupported, poseMemory, start });
  useEffect(() => {
    latest.current = { ...callbacks, onReady, onUnsupported, poseMemory, start };
  });

  useEffect(() => {
    let viewer: Viewer | null = null;
    let mounted = true;
    import('./viewer/createViewer')
      .then(({ createViewer }) => {
        if (!mounted || !container.current || !labels.current) return;
        viewer = createViewer(container.current, labels.current, data, {
          onSelect: (t) => latest.current.onSelect(t),
          onGroundPick: (lat, lon) => latest.current.onGroundPick(lat, lon),
          onPointPick: (lat, lon, target) => latest.current.onPointPick?.(lat, lon, target),
          onHover: (t, x, y) => latest.current.onHover(t, x, y),
          onCompass: (deg) => latest.current.onCompass(deg),
          ...(latest.current.selectionSweep ? { selectionSweep: {
            enabled: (kind: SweepKind) => latest.current.selectionSweep?.enabled(kind) ?? false,
            onSelect: (t: Target) => latest.current.selectionSweep?.onSelect(t),
            onState: (position: { clientX: number; clientY: number } | null) => latest.current.selectionSweep?.onState(position),
          } } : {}),
          // Solo si la pantalla lo pide: en los editores un clic sobre un cono debe marcar un punto.
          ...(latest.current.onViewConePick ? { onViewConePick: (id: number) => latest.current.onViewConePick?.(id) } : {}),
          onBalloonPick: (b) => latest.current.onBalloonPick?.(b),
          ...(latest.current.onIncidentPick ? { onIncidentPick: (id: number) => latest.current.onIncidentPick?.(id) } : {}),
        }, latest.current.poseMemory?.recall(), model,
          // Solo la pantalla del mapa pide globos; los selectores de los editores no los muestran.
          latest.current.onBalloonPick && balloons.current ? { ...latest.current.start, balloonRoot: balloons.current } : latest.current.start);
        latest.current.onReady(viewer);
      })
      .catch((error: unknown) => {
        console.error('No se pudo inicializar el visor 3D.', error);
        viewer?.dispose();
        viewer = null;
        if (mounted) latest.current.onUnsupported();
      });
    return () => {
      mounted = false;
      if (viewer) latest.current.poseMemory?.remember(viewer.pose());
      viewer?.dispose();
    };
  }, [data, model]);

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="map-3d">
      <div ref={container} className="absolute inset-0" />
      <div ref={labels} className={`pointer-events-none absolute inset-0 overflow-hidden ${bare ? 'hidden' : ''}`} aria-hidden="true" />
      <div ref={balloons} className={`pointer-events-none absolute inset-0 overflow-hidden ${bare ? 'hidden' : ''}`} role="group" aria-label="Globos del mapa" />
    </div>
  );
}
