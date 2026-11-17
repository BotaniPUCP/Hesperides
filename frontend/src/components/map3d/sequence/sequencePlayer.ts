import type { SequenceHooks } from '../viewer/sequenceHooks';
import { cameraPoseAt, SEQUENCE_DURATION_S } from './sequencePath';
import { frameAt, type SequenceFrame, type SequenceLook } from './sequenceTimeline';

/**
 * Reproduce la secuencia de SPEC-118 cuadro a cuadro. El reloj avanza con el
 * tiempo real, pero nunca más de MAX_STEP_S por cuadro (D-04): si el cambio de
 * versión traba un cuadro, la cámara no salta; solo dura un poco más la capa congelada.
 */

const MAX_STEP_S = 1 / 30;

export interface SequenceSurfaces {
  /** El contenedor del visor: lleva el desenfoque, el brillo y la escala. */
  effects: HTMLElement;
  /** Encima del visor, dentro de `effects`: muestra el cuadro congelado. */
  overlay: HTMLElement;
}

export interface SequenceClock {
  request: (tick: (now: number) => void) => number;
  cancel: (id: number) => void;
}

const BROWSER_CLOCK: SequenceClock = {
  request: (tick) => requestAnimationFrame(tick),
  cancel: (id) => cancelAnimationFrame(id),
};

export function applyEffects({ effects, overlay }: SequenceSurfaces, f: SequenceFrame): void {
  const blurred = f.blurPx > 0;
  effects.style.filter = blurred ? `blur(${f.blurPx.toFixed(2)}px) brightness(${f.brightness.toFixed(4)})` : '';
  effects.style.transform = blurred ? `scale(${f.scale.toFixed(4)})` : '';
  overlay.style.opacity = String(f.frozenOpacity);
  if (f.frozenOpacity === 0 && overlay.childElementCount > 0) overlay.replaceChildren();
}

function freezeInto(overlay: HTMLElement, frame: HTMLCanvasElement) {
  frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated';
  overlay.replaceChildren(frame);
}

/** Arranca desde cero; devuelve cómo detenerla. `onDone` llega con la pose final ya puesta. */
export function playSequence(viewer: SequenceHooks, surfaces: SequenceSurfaces, onDone: () => void,
  clock: SequenceClock = BROWSER_CLOCK): () => void {
  let t = 0, last: number | null = null, look: SequenceLook = 'low', id = 0;
  viewer.setSequenceLook(look);
  viewer.setPoseNow(cameraPoseAt(0));
  applyEffects(surfaces, frameAt(0));

  const tick = (now: number) => {
    t = Math.min(SEQUENCE_DURATION_S, t + (last === null ? 0 : Math.min((now - last) / 1000, MAX_STEP_S)));
    last = now;
    const f = frameAt(t);
    if (f.look !== look) {
      freezeInto(surfaces.overlay, viewer.freezeFrame());
      viewer.setSequenceLook(f.look);
      look = f.look;
    }
    applyEffects(surfaces, f);
    viewer.setPoseNow(cameraPoseAt(t));
    if (t >= SEQUENCE_DURATION_S) { onDone(); return; }
    id = clock.request(tick);
  };
  id = clock.request(tick);
  return () => clock.cancel(id);
}
