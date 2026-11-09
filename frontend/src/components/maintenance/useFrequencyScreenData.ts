'use client';

import { useEffect, useState } from 'react';
import type { GreenAreaSetSummary, MaintenanceFrequency } from '@shared/types';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { maintenanceApi } from '@/lib/maintenance-api';
import type { ActivityOption } from './FrequencyActivitySelect';

export interface FrequencyScreenData {
  frequencies: MaintenanceFrequency[];
  activities: ActivityOption[];
  ruleTypes: { id: number; code: string; label: string }[];
  sets: GreenAreaSetSummary[];
}

const EMPTY: FrequencyScreenData = { frequencies: [], activities: [], ruleTypes: [], sets: [] };

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
      greenAreaSetsApi.list().catch(() => []),
    ])
      .then(([frequencies, activities, ruleTypes, sets]) => {
        if (current) setData({ frequencies, activities, ruleTypes, sets });
      })
      .catch(() => { if (current) setFailed(true); })
      .finally(() => { if (current) setLoadedToken(reloadToken); });
    return () => { current = false; };
  }, [reloadToken]);

  return { ...data, loading: loadedToken !== reloadToken, failed };
}
