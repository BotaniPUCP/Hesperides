'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { PlaceDetail } from '@shared/types';
import { PlaceMapContext, type PlaceMapApi } from './PlaceMapContext';
import { PlaceMapPanel, type PerspectiveFocus } from './PlaceMapPanel';

/** La ficha de un lugar: /lugares/LUG-0001, no el catálogo ni /lugares/nuevo ni /lugares/migracion. */
export function isPlacePage(pathname: string | null): boolean {
  return pathname !== null && /^\/lugares\/(?!nuevo$|migracion$)[^/]+$/.test(pathname);
}

/**
 * Layout de /lugares. En las fichas pone el contenido a la izquierda y el mapa
 * fijo a la derecha (arriba en el teléfono). Como el layout no se desmonta al
 * pasar de una ficha a otra, el mapa tampoco: vuela al lugar nuevo.
 */
export function PlacesShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  // Con número de pedido: pulsar dos veces la misma perspectiva vuelve a volar.
  const [focus, setFocus] = useState<PerspectiveFocus>({ id: null, seq: 0 });
  const reload = useRef<() => void>(() => undefined);

  const api = useMemo<PlaceMapApi>(
    () => ({
      show: (p, onReload) => {
        reload.current = onReload;
        setPlace(p);
      },
      focusPerspective: (id) => setFocus((f) => ({ id, seq: f.seq + 1 })),
    }),
    [],
  );

  if (!isPlacePage(pathname)) {
    return <PlaceMapContext.Provider value={api}>{children}</PlaceMapContext.Provider>;
  }
  return (
    <PlaceMapContext.Provider value={api}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,42%)]">
        <div className="order-2 min-w-0 lg:order-1">{children}</div>
        <aside className="order-1 lg:sticky lg:top-6 lg:order-2 lg:self-start" aria-label="Mapa del lugar">
          <PlaceMapPanel place={place} focus={focus} onChanged={() => reload.current()} />
        </aside>
      </div>
    </PlaceMapContext.Provider>
  );
}
