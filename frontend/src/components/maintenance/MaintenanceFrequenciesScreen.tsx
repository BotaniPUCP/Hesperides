'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  CreateMaintenanceFrequencyRequest,
  MaintenanceFrequency,
  UpdateMaintenanceFrequencyRequest,
} from '@shared/types';
import { Button, Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { maintenanceApi } from '@/lib/maintenance-api';
import { FrequenciesTable } from './FrequenciesTable';
import { FrequencyFilters, type FilterState } from './FrequencyFilters';
import { FrequencyFormModal } from './FrequencyFormModal';

interface CatalogOption {
  id: number;
  code: string;
  label: string;
  parentCode?: string | null;
}

const NO_FILTERS: FilterState = { search: '', regime: '', ruleType: '' };

export function MaintenanceFrequenciesScreen() {
  const { user } = useAuth();
  const roleCode = user?.role?.code ?? '';
  const canManage = roleCode === 'ADMIN' || roleCode === 'COORDINADOR';

  const [frequencies, setFrequencies] = useState<MaintenanceFrequency[]>([]);
  const [activities, setActivities] = useState<CatalogOption[]>([]);
  const [ruleTypes, setRuleTypes] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(NO_FILTERS);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFrequency, setEditingFrequency] = useState<MaintenanceFrequency | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [reloadToken, setReloadToken] = useState(0);

  // Recargar solo mueve el token: quien pide los datos es el efecto, y el
  // estado se toca en los callbacks de la promesa, nunca en su cuerpo.
  const loadData = () => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  };

  useEffect(() => {
    let vigente = true;

    Promise.all([
      maintenanceApi.list().catch(() => []),
      maintenanceApi.getActivityTypes().catch(() => []),
      maintenanceApi.getRuleTypes().catch(() => []),
    ])
      .then(([freqRes, actRes, ruleRes]) => {
        if (!vigente) return;
        setFrequencies(Array.isArray(freqRes) ? freqRes : []);
        setActivities(Array.isArray(actRes) ? actRes : []);
        setRuleTypes(Array.isArray(ruleRes) ? ruleRes : []);
      })
      .catch(() => {
        if (vigente) setFeedback({ type: 'error', message: 'Error al cargar las frecuencias de mantenimiento' });
      })
      .finally(() => {
        if (vigente) setLoading(false);
      });

    return () => {
      vigente = false;
    };
  }, [reloadToken]);

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
      await maintenanceApi.update(editingFrequency.id, payload as UpdateMaintenanceFrequencyRequest);
      // Editar versiona: la anterior queda cerrada y esta rige desde hoy.
      setFeedback({
        type: 'success',
        message: 'Se creó una versión nueva. Los periodos ya evaluados conservan la anterior.',
      });
    } else {
      await maintenanceApi.create(payload as CreateMaintenanceFrequencyRequest);
      setFeedback({ type: 'success', message: 'Frecuencia registrada con éxito' });
    }
    loadData();
  };

  const hayFiltros = Boolean(filters.search || filters.regime || filters.ruleType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Frecuencias de Mantenimiento
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Periodicidades teóricas, rangos por estación y ciclos operativos del campus.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 transition-colors"
          >
            ← Volver al inicio
          </Link>
          {canManage && (
            <Button variant="primary" onClick={handleOpenCreate}>
              + Nueva frecuencia
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-md text-sm border flex justify-between items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
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
              action={
                canManage ? { label: 'Configurar primera frecuencia', onClick: handleOpenCreate } : undefined
              }
            />
          </div>
        ) : (
          <FrequenciesTable
            frequencies={filteredFrequencies}
            canManage={canManage}
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
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
