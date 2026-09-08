'use client';

import { useEffect, useState } from 'react';
import type { CatalogItemSummary } from '@shared/types';
import type { SelectOption } from '@/components/ui/Select';
import { apiClient } from '@/lib/api';

/**
 * Carga los ítems activos de un catálogo configurable (SPEC-100 §5.1,
 * useCatalog('ROLE') para el select de rol del alta de usuarios).
 */
export function useCatalog(typeCode: string) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    let disposed = false;
    Promise.resolve().then(() => {
      if (!disposed) setIsLoading(true);
    });
    apiClient
      .get<CatalogItemSummary[]>(`/catalogs/${encodeURIComponent(typeCode)}/items`)
      .then((items) => {
        if (!active) return;
        setOptions(items.map((item) => ({ id: item.id, code: item.code, label: item.label })));
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught : new Error('Error de catálogo'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      disposed = true;
    };
  }, [typeCode]);

  return { options, isLoading, error };
}