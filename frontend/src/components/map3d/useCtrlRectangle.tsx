'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';

/** Rectángulo en coordenadas de cliente, tal como lo dibujó la persona. */
export interface ScreenRect { x1: number; y1: number; x2: number; y2: number }
/** Botón izquierdo agrega; botón derecho quita. */
export type RectangleAction = 'add' | 'remove';

export const CTRL_LAYER_LABEL = 'Con Ctrl: arrastra con clic izquierdo para elegir o con clic derecho para quitar';

const LEFT_BUTTON = 0;
const RIGHT_BUTTON = 2;
/** Por debajo de este tamaño un arrastre es un clic: toma lo que está bajo el cursor. */
const MIN_DRAG_PX = 7;
/** Medio lado del cuadrito que reemplaza a un clic. */
const CLICK_RADIUS_PX = 3;

interface DragState { startX: number; startY: number; endX: number; endY: number; originX: number; originY: number; action: RectangleAction }

interface Options {
  mapRegion: RefObject<HTMLDivElement | null>;
  /** Sin mapa dibujado no hay nada que encerrar. */
  enabled: boolean;
  onRectangle: (rect: ScreenRect, action: RectangleAction) => void;
}

function actionOf(button: number): RectangleAction | null {
  if (button === LEFT_BUTTON) return 'add';
  if (button === RIGHT_BUTTON) return 'remove';
  return null;
}

function finalRect(d: DragState): ScreenRect {
  const tiny = Math.abs(d.endX - d.startX) < MIN_DRAG_PX && Math.abs(d.endY - d.startY) < MIN_DRAG_PX;
  if (!tiny) return { x1: d.startX, y1: d.startY, x2: d.endX, y2: d.endY };
  return { x1: d.startX - CLICK_RADIUS_PX, y1: d.startY - CLICK_RADIUS_PX, x2: d.startX + CLICK_RADIUS_PX, y2: d.startY + CLICK_RADIUS_PX };
}

/** Ctrl (o ⌘) apretado, leído del teclado: el mapa deja de girar y el puntero dibuja. */
function useCtrlHeld(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const track = (e: KeyboardEvent) => setHeld(e.ctrlKey || e.metaKey);
    const release = () => setHeld(false);
    window.addEventListener('keydown', track);
    window.addEventListener('keyup', track);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', track);
      window.removeEventListener('keyup', track);
      window.removeEventListener('blur', release);
    };
  }, []);
  return held;
}

/**
 * Selección múltiple sobre el mapa con Ctrl: una capa transparente tapa el lienzo mientras
 * Ctrl está apretado y dibuja el rectángulo. Qué hay dentro lo decide quien la usa.
 */
export function useCtrlRectangle({ mapRegion, enabled, onRectangle }: Options): { selecting: boolean; layer: ReactNode } {
  const ctrlHeld = useCtrlHeld();
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const selecting = enabled && (ctrlHeld || drag !== null);

  const update = (next: DragState | null) => { dragRef.current = next; setDrag(next); };
  const begin = (e: ReactPointerEvent<HTMLDivElement>) => {
    const action = actionOf(e.button);
    if (!action) return;
    e.preventDefault();
    const origin = mapRegion.current?.getBoundingClientRect();
    update({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY,
      originX: origin?.left ?? 0, originY: origin?.top ?? 0, action });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) update({ ...dragRef.current, endX: e.clientX, endY: e.clientY });
  };
  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    const current = dragRef.current;
    if (!current) return;
    update(null);
    onRectangle(finalRect({ ...current, endX: e.clientX, endY: e.clientY }), current.action);
  };

  // La capa tapa el lienzo y se comería la rueda: se la pasa al mapa para que acercar siga
  // funcionando. Escucha nativa no pasiva, para que la rueda no desplace además la página.
  const wheelLayer = useCallback((layer: HTMLDivElement | null) => {
    if (!layer) return;
    const forward = (e: WheelEvent) => {
      const canvas = mapRegion.current?.querySelector('canvas');
      if (!canvas) return;
      e.preventDefault();
      canvas.dispatchEvent(new WheelEvent('wheel', e));
    };
    layer.addEventListener('wheel', forward, { passive: false });
    return () => layer.removeEventListener('wheel', forward);
  }, [mapRegion]);

  const layer = selecting ? (
    <div ref={wheelLayer} aria-label={CTRL_LAYER_LABEL} className="absolute inset-0 z-20 cursor-crosshair touch-none"
      onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={() => update(null)}
      onContextMenu={(e) => e.preventDefault()}>
      {drag && <div className={`pointer-events-none absolute border-2 ${drag.action === 'add'
        ? 'border-brand-700 bg-brand-200/30' : 'border-action-danger bg-alert-danger-bg/40'}`}
        style={{ left: Math.min(drag.startX, drag.endX) - drag.originX, top: Math.min(drag.startY, drag.endY) - drag.originY,
          width: Math.abs(drag.endX - drag.startX), height: Math.abs(drag.endY - drag.startY) }} />}
    </div>
  ) : null;

  return { selecting, layer };
}
