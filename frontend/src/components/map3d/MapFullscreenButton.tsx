'use client';

import { useSyncExternalStore, type RefObject } from 'react';

export interface MapFullscreenButtonProps {
  target: RefObject<HTMLElement | null>;
}

function subscribe(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
}

const isSupported = () => Boolean(document.fullscreenEnabled);
const onServer = () => false;

/** Pone el mapa en pantalla completa; si el navegador (o el iframe) no lo permite, no aparece. */
export function MapFullscreenButton({ target }: MapFullscreenButtonProps) {
  const supported = useSyncExternalStore(subscribe, isSupported, onServer);
  const active = useSyncExternalStore(subscribe, () => document.fullscreenElement !== null && document.fullscreenElement === target.current, onServer);

  if (!supported) return null;

  const toggle = () => {
    if (active) void document.exitFullscreen();
    else void target.current?.requestFullscreen();
  };
  const label = active ? 'Salir de pantalla completa' : 'Pantalla completa';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md bg-white/95 text-neutral-700 shadow hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {active ? <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" /> : <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />}
      </svg>
    </button>
  );
}
