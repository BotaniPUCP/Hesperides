'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recordVisit } from '@/lib/navigationTrail';

/** Anota cada pantalla a la que se llega, para la flecha de volver. No dibuja nada. */
export function NavigationTrailTracker() {
  const pathname = usePathname();

  useEffect(() => {
    recordVisit(pathname);
  }, [pathname]);

  return null;
}
