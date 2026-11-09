'use client';

import React, { useMemo, useState } from 'react';
import type {
  CreateMaintenanceFrequencyRequest,
  MaintenanceFrequency,
  UpdateMaintenanceFrequencyRequest,
} from '@shared/types';
import { Button, Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { maintenanceApi } from '@/lib/maintenance-api';
import { FrequenciesTable } from './FrequenciesTable';
import { FrequencyFilters, type FilterState } from './FrequencyFilters';
import { FrequencyFormModal } from './FrequencyFormModal';
import { useFrequencyScreenData } from './useFrequencyScreenData';

const NO_FILTERS: FilterState = { search: '', regime: '', ruleType: '' };

/** Configurar cada cuánto se hace cada actividad (SPEC-203 §5.3); solo ADMIN y COORDINADOR llegan aquí. */
export function MaintenanceFrequenciesScreen() {
  const [reloadToken, setReloadToken] = useState(0);
  const { frequencies, activities, ruleTypes, sets, loading, failed } = useFrequencyScreenData(reloadToken);
  const [filters, setFilters] = useState<FilterState>(NO_FILTERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFrequency, setEditingFrequency] = useState<MaintenanceFrequency | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; warnings?: string[] } | null>(null);
  const loadData = () => setReloadToken((token) => token + 1);

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

  const handleOpenCreate = () => {
    setEditingFrequency(null);
    setIsModalOpen(true);
  };

  const handleDeactivate = async (id: number) => {
    const confirmado = confirm(
      '¿Deseas desactivar esta frecuencia de mantenimiento?\n\n' +
        'Se aplicará borrado lógico: la frecuencia dejará de estar activa para planificar ' +
        'intervenciones, pero se conservará en la base de datos para no perder el historial ' +
        'ni la trazabilidad.'
    );
    if (!confirmado) return;

    try {
      await maintenanceApi.delete(id);
      setFeedback({ type: 'success', message: 'Frecuencia desactivada y retirada de la lista activa.' });
      loadData();
    } catch {
      setFeedback({ type: 'error', message: 'No se pudo desactivar la frecuencia' });
    }
  };

  const handleFormSubmit = async (
    payload: CreateMaintenanceFrequencyRequest | UpdateMaintenanceFrequencyRequest
  ) => {
    if (editingFrequency) {
      const saved = await maintenanceApi.update(editingFrequency.id, payload as UpdateMaintenanceFrequencyRequest);
      // Editar versiona: la anterior queda cerrada y esta rige desde hoy.
      setFeedback({ type: 'success', warnings: saved.warnings,
        message: 'Se creó una versión nueva. Los periodos ya evaluados conservan la anterior.' });
    } else {
      const saved = await maintenanceApi.create(payload as CreateMaintenanceFrequencyRequest);
      setFeedback({ type: 'success', message: 'Frecuencia registrada con éxito', warnings: saved.warnings });
    }
    loadData();
  };

  const hayFiltros = Boolean(filters.search || filters.regime || filters.ruleType);

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Frecuencias</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Cada cuánto se hace cada actividad: para todo el campus o para un conjunto de jardines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleOpenCreate}>
            + Nueva frecuencia
          </Button>
        </div>
      </div>

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
        value={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
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
              action={{ label: 'Configurar primera frecuencia', onClick: handleOpenCreate }}
            />
          </div>
        ) : (
          <FrequenciesTable
            frequencies={filteredFrequencies}
            sets={sets}
            canManage
            onEdit={(f) => {
              setEditingFrequency(f);
              setIsModalOpen(true);
            }}
            onDeactivate={handleDeactivate}
          />
        )}
      </Card>

      <FrequencyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        frequencyToEdit={editingFrequency}
        activities={activities}
        ruleTypes={ruleTypes}
        sets={sets}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
