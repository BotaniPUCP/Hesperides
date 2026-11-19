'use client';

import type { RefObject } from 'react';
import { usePerspectiveRecorder, type PerspectiveSource } from './usePerspectiveRecorder';

/**
 * TEMPORAL: botón «Grabar vista» de la barra del mapa. Primer toque, empieza a grabar la
 * perspectiva; segundo, termina y descarga el JSON. Se quita con la carpeta `recording/`.
 */
export function RecordViewButton({ viewer, className }: { viewer: RefObject<PerspectiveSource | null>; className: string }) {
  const { recording, count, toggle } = usePerspectiveRecorder(viewer);
  return (
    <button
      type="button"
      aria-pressed={recording}
      title="Temporal: graba la cámara cuadro a cuadro; al detener descarga un archivo JSON"
      className={`${className} ${recording ? 'ring-1 ring-action-danger text-action-danger' : ''}`}
      onClick={toggle}
    >
      {recording ? `● Detener grabación (${count})` : 'Grabar vista'}
    </button>
  );
}
