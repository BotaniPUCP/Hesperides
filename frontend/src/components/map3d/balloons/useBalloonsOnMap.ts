'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { Balloon } from '@shared/types';
import type { Viewer } from '../viewer/createViewer';
import { useBalloons } from './useBalloons';

interface MapScreenLink {
  viewer: RefObject<Viewer | null>;
  /** Cambia cada vez que el visor se vuelve a armar: hay que volver a darle los globos. */
  viewerEpoch: number;
  unsupported: boolean;
  /** La ficha del mapa (elemento, perspectiva o punto) está abierta. */
  cardOpen: boolean;
  closeCard: () => void;
}

/**
 * Los globos de la pantalla del mapa (SPEC-113 §5.2): el interruptor, la carga, lo que se
 * le da al visor y la ficha corta. Solo una ficha a la vez: abrir un globo cierra la del
 * mapa y abrir la del mapa cierra la del globo.
 */
export function useBalloonsOnMap(link: MapScreenLink) {
  const [on, setOn] = useState(true);
  const [picked, setPicked] = useState<Balloon | null>(null);
  const { balloons, unavailableKinds, campusNotices, errorMessage } = useBalloons(on && !link.unsupported);
  const { viewer, viewerEpoch, cardOpen, closeCard } = link;

  useEffect(() => {
    viewer.current?.setBalloons(on ? balloons : []);
  }, [viewer, viewerEpoch, balloons, on]);

  const pick = useCallback((b: Balloon) => {
    closeCard();
    setPicked(b);
  }, [closeCard]);

  const toggle = useCallback((next: boolean) => {
    setOn(next);
    if (!next) setPicked(null);
  }, []);

  // La ficha muestra la versión más reciente del globo; si ya no está, lo avisa y espera.
  const latest = picked ? balloons.find((b) => b.id === picked.id) ?? null : null;
  return {
    on, toggle, balloons, unavailableKinds, campusNotices, errorMessage, pick,
    // Solo una ficha a la vez: con la del mapa abierta, la del globo no se muestra.
    card: picked && !cardOpen ? { balloon: latest ?? picked, gone: latest === null } : null,
    closeBalloon: () => setPicked(null),
  };
}
