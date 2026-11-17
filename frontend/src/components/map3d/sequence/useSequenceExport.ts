'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Viewer } from '../viewer/createViewer';
import { EXPORT_FPS, EXPORT_SIZE, exportSequence } from './exportSequence';
import { createMp4Sink } from './mp4Sink';

/** La exportación a MP4 de SPEC-118 §8, con su avance en por ciento y cómo cancelarla. */

const FILE_NAME = 'secuencia-mapa.mp4';

function download(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: FILE_NAME });
  link.click();
  // Se libera después: el navegador necesita la URL viva mientras arranca la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface SequenceExport {
  /** Por ciento exportado; null si no se está exportando. */
  percent: number | null;
  /** Resuelve con null si terminó o se canceló, o con el motivo si falló. */
  start: (viewer: Viewer) => Promise<string | null>;
  cancel: () => void;
}

export function useSequenceExport(): SequenceExport {
  const [percent, setPercent] = useState<number | null>(null);
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);

  const start = useCallback(async (viewer: Viewer) => {
    const controller = new AbortController();
    running.current = controller;
    setPercent(0);
    const canvas = Object.assign(document.createElement('canvas'), EXPORT_SIZE);
    try {
      const sink = await createMp4Sink(canvas, EXPORT_FPS);
      const blob = await exportSequence({ viewer, canvas, sink, signal: controller.signal,
        onProgress: (fraction) => setPercent(Math.floor(fraction * 100)) });
      download(blob);
      return null;
    } catch (error) {
      if (controller.signal.aborted) return null;
      console.error('SPEC-118: la exportación a MP4 falló', error);
      return error instanceof Error ? error.message : 'La exportación falló; el detalle está en la consola.';
    } finally {
      running.current = null;
      setPercent(null);
    }
  }, []);

  const cancel = useCallback(() => running.current?.abort(), []);
  return { percent, start, cancel };
}
