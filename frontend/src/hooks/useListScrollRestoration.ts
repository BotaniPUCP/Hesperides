'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { readListScroll, saveListScroll } from '@/lib/listScroll';

// Las imágenes y los paneles que cargan después siguen estirando la página.
const RESTORE_TIMEOUT_MS = 3000;
// El router también mueve la página al llegar: la posición debe mantenerse unos cuadros.
const STABLE_FRAMES = 3;
const POSITION_TOLERANCE_PX = 2;
const USER_INPUT_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'];

/** Lleva la página a `top` hasta que se mantenga allí. Devuelve cómo cancelarlo sin avisar. */
function restoreScroll(top: number, onDone: () => void): () => void {
  const deadline = performance.now() + RESTORE_TIMEOUT_MS;
  let stableFrames = 0;
  let frame = 0;

  function cancel() {
    cancelAnimationFrame(frame);
    USER_INPUT_EVENTS.forEach((event) => window.removeEventListener(event, finish));
  }
  function finish() {
    cancel();
    onDone();
  }
  function step() {
    if (performance.now() > deadline) return finish();
    if (Math.abs(window.scrollY - top) <= POSITION_TOLERANCE_PX) {
      stableFrames += 1;
      if (stableFrames >= STABLE_FRAMES) return finish();
    } else {
      stableFrames = 0;
      window.scrollTo(0, top);
    }
    frame = requestAnimationFrame(step);
  }

  // Si la persona se mueve, manda ella: no se le arrastra de vuelta.
  USER_INPUT_EVENTS.forEach((event) => window.addEventListener(event, finish, { passive: true }));
  window.scrollTo(0, top);
  frame = requestAnimationFrame(step);
  return cancel;
}

/**
 * Guarda la posición de un listado al salir y la recupera al volver con los mismos
 * filtros. `ready` indica que los datos ya están: antes la página es muy corta para
 * llegar a la posición. Solo restaura una vez por visita.
 */
export function useListScrollRestoration(path: string, query: string, ready: boolean): void {
  const settled = useRef(false);
  const lastTop = useRef<number | null>(null);
  const currentQuery = useRef(query);

  useEffect(() => {
    currentQuery.current = query;
  }, [query]);

  // De layout y no pasivo: el efecto pasivo se limpia tras pintar la pantalla siguiente,
  // y para entonces el router ya subió la página y se guardaría esa posición.
  useLayoutEffect(() => {
    // Hasta terminar de restaurar, los saltos son de la página y no de la persona.
    const onScroll = () => {
      if (settled.current) lastTop.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (lastTop.current !== null) saveListScroll(path, currentQuery.current, lastTop.current);
    };
  }, [path]);

  useEffect(() => {
    if (!ready || settled.current) return;
    const saved = readListScroll(path);
    if (saved === null || saved.query !== query) {
      settled.current = true;
      return;
    }
    return restoreScroll(saved.top, () => {
      settled.current = true;
    });
  }, [path, query, ready]);
}
