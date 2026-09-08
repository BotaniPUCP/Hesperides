'use client';

import { useEffect, useState } from 'react';
import type { SelectOption } from '@/components/ui/Select';
import { apiClient } from '@/lib/api';

interface TeamOption {
  id: number;
  name: string;
}

/** Cuadrillas activas para el filtro del listado (SPEC-100 §7.1). */
export function useTeams() {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let disposed = false;
    Promise.resolve().then(() => {
      if (!disposed) setIsLoading(true);
    });
    apiClient
      .get<TeamOption[]>('/teams')
      .then((teams) => {
        if (!active) return;
        setOptions(teams.map((team) => ({ id: team.id, code: String(team.id), label: team.name })));
      })
      .catch(() => {
        // Sin cuadrillas o sin permiso, el select queda vacío; el listado no falla.
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      disposed = true;
    };
  }, []);

  return { options, isLoading };
}