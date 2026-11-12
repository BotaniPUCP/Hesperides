'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRememberedHref } from '@/hooks/useRememberedHref';
import { previousPath, subscribeToTrail } from '@/lib/navigationTrail';

export interface BackButtonProps {
  /** A dónde ir sin recorrido previo, como al abrir un enlace directo. Sin él, la flecha se oculta. */
  fallbackHref?: string;
}

/** Flecha para regresar a la pantalla anterior tal como estaba. */
export function BackButton({ fallbackHref }: BackButtonProps) {
  const previous = useSyncExternalStore(subscribeToTrail, previousPath, () => null);
  const target = previous ?? fallbackHref ?? null;
  const href = useRememberedHref(target ?? '');

  if (target === null) return null;

  return (
    <Link
      href={href}
      aria-label="Volver"
      title="Volver"
      className="surface-pill inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 text-neutral-700 transition-colors hover:text-brand-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m6 7l-7-7 7-7" />
      </svg>
    </Link>
  );
}
