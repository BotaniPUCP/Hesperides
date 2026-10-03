'use client';

import { useEffect, useRef } from 'react';
import type { SceneData } from './sceneData';
import type { CameraPose } from './viewer/cameraRig';
import type { Viewer, ViewerCallbacks } from './viewer/createViewer';

/** Guarda la vista entre montajes, para que la cámara no vuelva al encuadre inicial. */
export interface PoseMemory {
  recall: () => CameraPose | undefined;
  remember: (pose: CameraPose) => void;
}

export interface Map3DViewProps extends ViewerCallbacks {
  data: SceneData;
  onReady: (viewer: Viewer) => void;
  /** El navegador no pudo crear el contexto WebGL: quien llama muestra las listas. */
  onUnsupported: () => void;
  poseMemory?: PoseMemory;
}

/**
 * Monta el visor de three.js en un div. El visor se importa al montar y no
 * arriba del archivo: three pesa ~600 kB y no tiene sentido en el servidor ni
 * en las pantallas que no muestran el mapa.
 */
export function Map3DView({ data, onReady, onUnsupported, poseMemory, ...callbacks }: Map3DViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  // Los callbacks cambian en cada render del padre; el visor se crea una sola
  // vez, así que lee siempre los más recientes a través de esta referencia.
  const latest = useRef({ ...callbacks, onReady, onUnsupported, poseMemory });
  useEffect(() => {
    latest.current = { ...callbacks, onReady, onUnsupported, poseMemory };
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
          onPointPick: (lat, lon) => latest.current.onPointPick?.(lat, lon),
          onHover: (t, x, y) => latest.current.onHover(t, x, y),
          onCompass: (deg) => latest.current.onCompass(deg),
        }, latest.current.poseMemory?.recall());
        latest.current.onReady(viewer);
      })
      .catch(() => {
        if (mounted) latest.current.onUnsupported();
      });
    return () => {
      mounted = false;
      if (viewer) latest.current.poseMemory?.remember(viewer.pose());
      viewer?.dispose();
    };
  }, [data]);

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="map-3d">
      <div ref={container} className="absolute inset-0" />
      <div ref={labels} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />
    </div>
  );
}
