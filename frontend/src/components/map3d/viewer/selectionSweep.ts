import type { LayerId, Target } from '../target';
import type { PointerHandlers } from './pointerInput';

/** Las capas que son jardines: se eligen, se marcan y se barren juntas. */
export const SECTION_LAYERS = ['greenAreas', 'xerophytic', 'reserve'] as const;

/** Lo que un barrido elige: jardines o ejemplares, nunca los dos. */
export type SweepKind = 'section' | 'specimen';

/** Lo que la pantalla decide del barrido: si acepta ese tipo, qué agregar y dónde va el puntero. */
export interface SelectionSweepCallbacks {
  enabled: (kind: SweepKind) => boolean;
  onSelect: (target: Target) => void;
  onState: (position: { clientX: number; clientY: number } | null) => void;
}

interface Deps {
  pickAt: (clientX: number, clientY: number) => Target | null;
  callbacks: SelectionSweepCallbacks;
  /** Al empezar: la cámara deja de girar y se apagan las marcas de selección y paso. */
  begin: () => void;
  end: () => void;
  requestRender: () => void;
}

/** Separación entre muestras al interpolar un arrastre rápido, en píxeles. */
const SAMPLE_PX = 8;
const MAX_SAMPLES = 64;

export function sweepKindOf(layer: LayerId): SweepKind | null {
  if (layer === 'vegetation') return 'specimen';
  return (SECTION_LAYERS as readonly LayerId[]).includes(layer) ? 'section' : null;
}

/**
 * Mantener pulsado y arrastrar: agrega todo lo que toca, pero solo del tipo sobre el que
 * empezó. Empezar en un ejemplar barre ejemplares; empezar en un jardín, jardines.
 */
export function createSelectionSweep({ pickAt, callbacks, begin, end, requestRender }: Deps): NonNullable<PointerHandlers['sweep']> {
  let kind: SweepKind | null = null;
  let previous: { x: number; y: number } | null = null;
  const swept = new Set<string>();

  const kindAt = (x: number, y: number) => {
    const hit = pickAt(x, y);
    return hit ? sweepKindOf(hit.layer) : null;
  };
  const visit = (x: number, y: number) => {
    const hit = pickAt(x, y);
    if (!hit || sweepKindOf(hit.layer) !== kind) return;
    const key = `${hit.layer}:${hit.index}`;
    if (swept.has(key)) return;
    swept.add(key);
    callbacks.onSelect(hit);
  };
  // Un arrastre rápido salta píxeles entre eventos: se muestrea el tramo para no saltarse nada.
  const sweepTo = (x: number, y: number) => {
    const from = previous ?? { x, y };
    const steps = Math.max(1, Math.min(MAX_SAMPLES, Math.ceil(Math.hypot(x - from.x, y - from.y) / SAMPLE_PX)));
    for (let n = 1; n <= steps; n++) visit(from.x + (x - from.x) * n / steps, from.y + (y - from.y) * n / steps);
    previous = { x, y };
    requestRender();
  };

  return {
    enabled: () => (kind ? callbacks.enabled(kind) : callbacks.enabled('section') || callbacks.enabled('specimen')),
    canStart: (x, y) => {
      const at = kindAt(x, y);
      return at !== null && callbacks.enabled(at);
    },
    onStart: (x, y) => {
      kind = kindAt(x, y);
      previous = null;
      swept.clear();
      begin();
      callbacks.onState({ clientX: x, clientY: y });
      sweepTo(x, y);
    },
    onMove: (x, y) => {
      callbacks.onState({ clientX: x, clientY: y });
      sweepTo(x, y);
    },
    onEnd: () => {
      kind = null;
      previous = null;
      swept.clear();
      end();
      callbacks.onState(null);
      requestRender();
    },
  };
}
