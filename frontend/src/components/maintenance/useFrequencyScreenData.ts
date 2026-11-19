'use client';

import { useEffect, useState } from 'react';
import type { MaintenanceFrequency } from '@shared/types';
import { maintenanceApi } from '@/lib/maintenance-api';
import type { ActivityOption } from './FrequencyActivitySelect';

export interface FrequencyScreenData {
  frequencies: MaintenanceFrequency[];
  activities: ActivityOption[];
  ruleTypes: { id: number; code: string; label: string }[];
}

const EMPTY: FrequencyScreenData = { frequencies: [], activities: [], ruleTypes: [] };

/**
 * Lo que la pantalla de frecuencias lee, de nuevo cada vez que cambia el token.
 * El estado se toca en los callbacks de la promesa, nunca en el cuerpo del efecto.
 */
export function useFrequencyScreenData(reloadToken: number) {
  const [data, setData] = useState<FrequencyScreenData>(EMPTY);
  const [loadedToken, setLoadedToken] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    Promise.all([
      maintenanceApi.list().catch(() => []),
      maintenanceApi.getActivityTypes().catch(() => []),
      maintenanceApi.getRuleTypes().catch(() => []),
    ])
      .then(([frequencies, activities, ruleTypes]) => {
        if (current) setData({ frequencies, activities, ruleTypes });
      })
      .catch(() => { if (current) setFailed(true); })
      .finally(() => { if (current) setLoadedToken(reloadToken); });
    return () => { current = false; };
  }, [reloadToken]);

  return { ...data, loading: loadedToken !== reloadToken, failed };
}
