'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { changed, recordingFile, toSample, type LivePerspective, type PerspectiveSample } from './perspectiveRecording';

/**
 * TEMPORAL: «Grabar vista». El primer toque empieza a guardar la cámara en cada cuadro en que
 * cambia; el segundo termina y descarga el archivo JSON. Se quita junto con el botón.
 */

/** El contador del botón se refresca así de seguido; cada cuadro sería un render de React por cuadro. */
const COUNT_REFRESH_MS = 250;

export interface PerspectiveSource {
  livePerspective: () => LivePerspective;
}

export interface PerspectiveRecorder {
  recording: boolean;
  /** Muestras guardadas hasta ahora en la grabación en curso. */
  count: number;
  toggle: () => void;
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function usePerspectiveRecorder(viewer: RefObject<PerspectiveSource | null>): PerspectiveRecorder {
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);
  const samples = useRef<PerspectiveSample[]>([]);
  const startedAt = useRef(new Date());

  useEffect(() => {
    if (!recording) return;
    const origin = performance.now();
    let frame = requestAnimationFrame(function sample(now: number) {
      const source = viewer.current;
      if (source) {
        const next = toSample(source.livePerspective(), Math.max(0, now - origin));
        if (changed(samples.current.at(-1), next)) samples.current.push(next);
      }
      frame = requestAnimationFrame(sample);
    });
    const counter = setInterval(() => setCount(samples.current.length), COUNT_REFRESH_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(counter);
    };
  }, [recording, viewer]);

  const toggle = useCallback(() => {
    if (recording) {
      const file = recordingFile(samples.current, startedAt.current, new Date());
      download(file.name, file.content);
    } else {
      samples.current = [];
      startedAt.current = new Date();
    }
    setCount(0);
    setRecording(!recording);
  }, [recording]);

  return { recording, count, toggle };
}
