'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  CreateMaintenanceFrequencyRequest,
  FrequencyRuleTypeCode,
  MaintenanceFrequency,
  MaintenanceRegime,
  UpdateMaintenanceFrequencyRequest,
} from '@shared/types';
import { Badge, Button, Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { maintenanceApi } from '@/lib/maintenance-api';
import { FrequencyFormModal } from './FrequencyFormModal';
import { FrequencyRuleBadge } from './FrequencyRuleBadge';

export function MaintenanceFrequenciesScreen() {
  const { user } = useAuth();
  const roleCode = user?.role?.code ?? '';
  const canManage = roleCode === 'ADMIN' || roleCode === 'COORDINADOR';

  const [frequencies, setFrequencies] = useState<MaintenanceFrequency[]>([]);
  const [activities, setActivities] = useState<{ id: number; code: string; label: string }[]>([]);
  const [ruleTypes, setRuleTypes] = useState<{ id: number; code: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regimeFilter, setRegimeFilter] = useState<string>('');
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFrequency, setEditingFrequency] = useState<MaintenanceFrequency | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [freqRes, actRes, ruleRes] = await Promise.all([
        maintenanceApi.list().catch(() => []),
        maintenanceApi.getActivityTypes().catch(() => []),
        maintenanceApi.getRuleTypes().catch(() => []),
      ]);
      setFrequencies(Array.isArray(freqRes) ? freqRes : []);
      setActivities(Array.isArray(actRes) ? actRes : []);
      setRuleTypes(Array.isArray(ruleRes) ? ruleRes : []);
    } catch {
      setFeedback({ type: 'error', message: 'Error al cargar las frecuencias de mantenimiento' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFrequencies = useMemo(() => {
    return frequencies.filter((f) => {
      const matchesSearch =
        !search ||
        f.activityType.label.toLowerCase().includes(search.toLowerCase()) ||
        (f.notes && f.notes.toLowerCase().includes(search.toLowerCase()));

      const matchesRegime = !regimeFilter || f.regime === regimeFilter;
      const matchesRuleType = !ruleTypeFilter || f.frequencyRuleType.code === ruleTypeFilter;

      return matchesSearch && matchesRegime && matchesRuleType;
    });
  }, [frequencies, search, regimeFilter, ruleTypeFilter]);

  const handleOpenCreate = () => {
    setEditingFrequency(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: MaintenanceFrequency) => {
    setEditingFrequency(f);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        '¿Deseas desactivar esta frecuencia de mantenimiento?\n\n' +
          'Se aplicará borrado lógico: la frecuencia dejará de estar activa para planificar intervenciones, pero se conservará en la base de datos para no perder el historial ni la trazabilidad.'
      )
    ) {
      return;
    }
    try {
      await maintenanceApi.delete(id);
      setFeedback({ type: 'success', message: 'Frecuencia desactivada y retirada de la lista activa.' });
      loadData();
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: 'No se pudo desactivar la frecuencia' });
    }
  };

  const handleFormSubmit = async (
    payload: CreateMaintenanceFrequencyRequest | UpdateMaintenanceFrequencyRequest
  ) => {
    if (editingFrequency) {
      await maintenanceApi.update(editingFrequency.id, payload as UpdateMaintenanceFrequencyRequest);
      setFeedback({ type: 'success', message: 'Frecuencia actualizada con éxito' });
    } else {
      await maintenanceApi.create(payload as CreateMaintenanceFrequencyRequest);
      setFeedback({ type: 'success', message: 'Frecuencia registrada con éxito' });
    }
    loadData();
  };

  const renderParameters = (f: MaintenanceFrequency) => {
    switch (f.frequencyRuleType.code) {
      case 'INTERVAL_DAYS':
        return (
          <div className="text-xs">
            <span className="font-medium text-neutral-900">
              {f.minDaysInterval} a {f.maxDaysInterval} días
            </span>
            {f.targetDaysInterval && (
              <span className="text-neutral-500 block">Teórico: cada {f.targetDaysInterval}d</span>
            )}
            {f.seasonModifier && (
              <span className="text-primary-600 block italic">{f.seasonModifier}</span>
            )}
          </div>
        );
      case 'SEASONAL_PERIOD':
      case 'ANNUAL_WINDOW':
        return (
          <div className="text-xs">
            <span className="font-medium text-neutral-900">
              Mín. {f.annualTargetCount} por año
            </span>
            {f.seasonModifier && (
              <span className="text-neutral-500 block">{f.seasonModifier}</span>
            )}
          </div>
        );
      case 'COVERAGE_CYCLE':
        return (
          <div className="text-xs">
            <span className="font-medium text-neutral-900">
              100% en {f.coverageTargetDays} días
            </span>
            <span className="text-neutral-500 block">Ciclo rotativo continuo</span>
          </div>
        );
      case 'ON_DEMAND':
        return <span className="text-xs text-neutral-500">A demanda / riesgo</span>;
      default:
        return null;
    }
  };

  const formatRegime = (regime: MaintenanceRegime) => {
    switch (regime) {
      case 'OUTSOURCED':
        return <Badge label="Tercerizado" color="info" />;
      case 'IN_HOUSE':
        return <Badge label="Personal propio" color="brand" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Frecuencias de Mantenimiento
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Configuración de periodicidades teóricas, rangos estacionales y ciclos operativos del campus.
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
          className={`p-3 rounded-md text-sm border flex justify-between items-center ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold ml-2 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Buscar actividad</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej. Corte de césped, poda..."
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Modalidad de ejecución</label>
            <select
              value={regimeFilter}
              onChange={(e) => setRegimeFilter(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Todas las modalidades</option>
              <option value="OUTSOURCED">Tercerizado</option>
              <option value="IN_HOUSE">Personal Propio</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Tipo de regla</label>
            <select
              value={ruleTypeFilter}
              onChange={(e) => setRuleTypeFilter(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Todos los modelos</option>
              <option value="INTERVAL_DAYS">Intervalo por días</option>
              <option value="SEASONAL_PERIOD">Periodicidad estacional</option>
              <option value="ANNUAL_WINDOW">Ventana anual</option>
              <option value="COVERAGE_CYCLE">Ciclo de cobertura</option>
              <option value="ON_DEMAND">A demanda</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Data List */}
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
                search || regimeFilter || ruleTypeFilter
                  ? 'No se encontraron resultados con los filtros aplicados.'
                  : 'Registra las periodicidades para poda, corte de césped, fitosanitario o riego.'
              }
              action={
                canManage
                  ? {
                      label: 'Configurar primera frecuencia',
                      onClick: handleOpenCreate,
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Actividad / Labor</th>
                  <th className="px-4 py-3">Modalidad</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3">Parámetros</th>
                  <th className="px-4 py-3">Duración</th>
                  <th className="px-4 py-3">Ámbito</th>
                  {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredFrequencies.map((f) => (
                  <tr key={f.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      <div>{f.activityType.label}</div>
                      {f.notes && (
                        <div className="text-xs text-neutral-500 font-normal truncate max-w-xs" title={f.notes}>
                          {f.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatRegime(f.regime)}</td>
                    <td className="px-4 py-3">
                      <FrequencyRuleBadge
                        ruleCode={f.frequencyRuleType.code}
                        label={f.frequencyRuleType.label}
                      />
                    </td>
                    <td className="px-4 py-3">{renderParameters(f)}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {f.estimatedDurationDays ? `${f.estimatedDurationDays} días` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {f.scope === 'CAMPUS_WIDE'
                        ? 'Todo el campus'
                        : f.scope === 'BY_SECTOR'
                        ? 'Por sector'
                        : 'Por zona'}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(f)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(f.id)}
                        >
                          Desactivar
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Form */}
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
