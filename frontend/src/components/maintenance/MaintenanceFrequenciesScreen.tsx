'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useListUrlState } from '@/hooks/useListUrlState';
import { useSearchDraft } from '@/hooks/useSearchDraft';
import { FrequenciesTable } from './FrequenciesTable';
import { FrequencyFilters, type FilterState } from './FrequencyFilters';
import { FREQUENCIES_PATH, FREQUENCY_LIST_DEFAULTS, takeFrequencyFlash, type FrequencyFlash } from './frequencyListState';
import { useFrequencyScreenData } from './useFrequencyScreenData';

/** Configurar cada cuánto se hace cada actividad (SPEC-203 §5.3); solo ADMIN y COORDINADOR llegan aquí. */
export function MaintenanceFrequenciesScreen() {
  const router = useRouter();
  const { frequencies, ruleTypes, loading, failed } = useFrequencyScreenData(0);
  // Los filtros viven en la URL: al volver a la pantalla, la tabla sigue filtrada.
  const { values: filters, setValues: setFilters, query } = useListUrlState(FREQUENCIES_PATH, FREQUENCY_LIST_DEFAULTS);
  useListScrollRestoration(FREQUENCIES_PATH, query, !loading);
  const [searchInput, setSearchInput] = useSearchDraft(filters.search, (search) => setFilters({ search }));
  const handleFiltersChange = ({ search, ...others }: Partial<FilterState>) => {
    if (search !== undefined) setSearchInput(search);
    else setFilters(others);
  };
  // El aviso que deja la página de una frecuencia al guardar o desactivar.
  const [feedback, setFeedback] = useState<FrequencyFlash | null>(() => (typeof window === 'undefined' ? null : takeFrequencyFlash()));

  const filteredFrequencies = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return frequencies.filter((f) => {
      const matchesSearch =
        !term ||
        f.activityType.label.toLowerCase().includes(term) ||
        (f.notes?.toLowerCase().includes(term) ?? false);
      const matchesRegime = !filters.regime || f.regime === filters.regime;
      const matchesRuleType = !filters.ruleType || f.frequencyRuleType.code === filters.ruleType;
      return matchesSearch && matchesRegime && matchesRuleType;
    });
  }, [frequencies, filters]);

  const openCreate = () => router.push(`${FREQUENCIES_PATH}/nueva`);

  const hayFiltros = Boolean(filters.search || filters.regime || filters.ruleType);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Frecuencias"
        description="Cada cuánto se hace cada actividad, en todo el campus o solo en algunas áreas. Dónde se usa cada una se decide en Planificación."
        actions={<Link href={`${FREQUENCIES_PATH}/nueva`} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          + Nueva frecuencia</Link>}
      />

      {failed && !feedback && (
        <p role="alert" className="text-sm text-action-danger">Error al cargar las frecuencias de mantenimiento</p>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-md text-sm border flex justify-between items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-alert-success-bg text-alert-success-fg border-alert-success-border'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>
            {feedback.message}
            {feedback.warnings?.map((w) => <span key={w} className="block text-alert-warning-fg">{w}</span>)}
          </span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      <FrequencyFilters
        value={{ search: searchInput, regime: filters.regime, ruleType: filters.ruleType }}
        onChange={handleFiltersChange}
        ruleTypes={ruleTypes}
      />

      <Card padded={false}>
        {loading ? (
          <div className="p-6 space-y-4">
            <LoadingSkeleton className="h-6 w-1/3" />
            <LoadingSkeleton className="h-10 w-full" />
            <LoadingSkeleton className="h-10 w-full" />
            <LoadingSkeleton className="h-10 w-full" />
          </div>
        ) : filteredFrequencies.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No hay frecuencias configuradas"
              description={
                hayFiltros
                  ? 'No se encontraron resultados con los filtros aplicados.'
                  : 'Registra las periodicidades para poda, corte de césped, fitosanitario o riego.'
              }
              action={{ label: 'Configurar primera frecuencia', onClick: openCreate }}
            />
          </div>
        ) : (
          <FrequenciesTable
            frequencies={filteredFrequencies}
            canManage
            onEdit={(f) => router.push(`${FREQUENCIES_PATH}/${f.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
