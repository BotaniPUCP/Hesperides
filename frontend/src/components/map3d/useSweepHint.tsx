'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/** Cuánto se ve «Arrastra» al empezar un barrido; luego estorbaría la vista. */
const HINT_MS = 3000;
/** Márgenes para que la burbuja no se salga del mapa por los bordes. */
const EDGE_X_PX = 50;
const EDGE_Y_PX = 42;
const LIFT_PX = 8;

/**
 * La burbuja «Arrastra» que sigue al puntero cuando empieza un barrido (mantener
 * pulsado y arrastrar). Se ve unos segundos y se va, aunque el barrido siga.
 */
export function useSweepHint(container: RefObject<HTMLDivElement | null>): {
  onState: (position: { clientX: number; clientY: number } | null) => void; badge: ReactNode;
} {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => clear, []);

  const onState = (next: { clientX: number; clientY: number } | null) => {
    if (!next) { active.current = false; clear(); setVisible(false); setPosition(null); return; }
    if (!active.current) {
      active.current = true; setVisible(true);
      timer.current = setTimeout(() => { setVisible(false); timer.current = null; }, HINT_MS);
    }
    const rect = container.current?.getBoundingClientRect();
    if (rect) setPosition({ x: Math.max(EDGE_X_PX, Math.min(rect.width - EDGE_X_PX, next.clientX - rect.left)),
      y: Math.max(EDGE_Y_PX, Math.min(rect.height, next.clientY - rect.top)) });
  };

  const badge = position && visible ? (
    <div role="status" style={{ left: position.x, top: position.y - LIFT_PX }}
      className="pointer-events-none absolute z-10 inline-flex -translate-x-1/2 -translate-y-full items-center gap-2 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm font-semibold text-neutral-900 shadow-xs">
      <span aria-hidden="true">✊</span> Arrastra
    </div>
  ) : null;
  return { onState, badge };
}
