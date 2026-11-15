'use client';

import { useEffect, useState } from 'react';
import type { Balloon, BalloonKind } from '@shared/types';
import { mensajeDeApiError } from '@/lib/api-errors';
import { balloonsApi } from '@/lib/balloons-api';

/** Cada cuánto se vuelven a pedir los globos: son del presente, no se guardan (SPEC-113 §5.6). */
export const REFRESH_MS = 60_000;

export interface UseBalloonsResult {
  balloons: Balloon[];
  unavailableKinds: BalloonKind[];
  errorMessage: string | null;
}

const EMPTY: UseBalloonsResult = { balloons: [], unavailableKinds: [], errorMessage: null };

/**
 * Los globos del mapa mientras el interruptor está encendido: al encender, cada minuto
 * con la pestaña visible y al volver a ella. Apagado no pide nada.
 */
export function useBalloons(enabled: boolean): UseBalloonsResult {
  const [state, setState] = useState<UseBalloonsResult>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    const load = () => {
      balloonsApi.list()
        .then((r) => { if (current) setState({ balloons: r.balloons, unavailableKinds: r.unavailableKinds, errorMessage: null }); })
        .catch((e: unknown) => { if (current) setState((s) => ({ ...s, errorMessage: mensajeDeApiError(e) })); });
    };
    const visible = () => document.visibilityState !== 'hidden';
    const onVisibility = () => { if (visible()) load(); };
    load();
    const timer = window.setInterval(() => { if (visible()) load(); }, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      current = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  return enabled ? state : EMPTY;
}
