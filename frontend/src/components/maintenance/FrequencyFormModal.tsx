'use client';

import React, { useMemo, useState } from 'react';
import type {
  CreateMaintenanceFrequencyRequest,
  FrequencyRuleTypeCode,
  MaintenanceFrequency,
  MaintenanceRegime,
  MaintenanceScope,
  UpdateMaintenanceFrequencyRequest,
} from '@shared/types';
import { Button, Modal } from '@/components/ui';
import { buildFrequencyPayload } from './buildFrequencyPayload';
import { RuleTypeFields, type RuleFieldsState } from './RuleTypeFields';
import { ANNUAL_WINDOWS, toRow } from './seasons';

interface ActivityOption {
  id: number;
  code: string;
  label: string;
  parentCode?: string | null;
}

interface RuleTypeOption {
  id: number;
  code: string;
  label: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  frequencyToEdit?: MaintenanceFrequency | null;
  activities: ActivityOption[];
  ruleTypes: RuleTypeOption[];
  onSubmit: (payload: CreateMaintenanceFrequencyRequest | UpdateMaintenanceFrequencyRequest) => Promise<void>;
}

const INPUT = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none';
const SELECT = `${INPUT} bg-white`;
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1';

const EMPTY_FIELDS: RuleFieldsState = {
  bySeasons: false,
  seasonRows: [],
  minDays: '',
  maxDays: '',
  targetDays: '',
  annualCount: '',
  windowPreset: ANNUAL_WINDOWS[0].value,
  coverageDays: '',
};

const optionalText = (value: number | null | undefined) => (value != null ? String(value) : '');

function fieldsFrom(f: MaintenanceFrequency): RuleFieldsState {
  const window = ANNUAL_WINDOWS.find(
    (w) => w.startMonth === f.seasonStartMonth && w.endMonth === f.seasonEndMonth
  );
  return {
    // Las estaciones se leen tal cual: ya no hay que adivinarlas desde el
    // rango general, que era lo que perdía el detalle al editar.
    bySeasons: f.seasons.length > 0,
    seasonRows: f.seasons.map(toRow),
    minDays: optionalText(f.minDaysInterval),
    maxDays: optionalText(f.maxDaysInterval),
    targetDays: optionalText(f.targetDaysInterval),
    annualCount: optionalText(f.annualTargetCount),
    windowPreset: window?.value ?? ANNUAL_WINDOWS[0].value,
    coverageDays: optionalText(f.coverageTargetDays),
  };
}

/**
 * El formulario solo existe mientras el modal está abierto, y con una key por
 * frecuencia: así cada apertura nace con su estado inicial, sin un efecto que
 * lo resetee a golpe de setState (react-hooks/set-state-in-effect).
 */
export function FrequencyFormModal(props: Props) {
  if (!props.isOpen) return null;
  return <FrequencyForm key={props.frequencyToEdit?.id ?? 'nueva'} {...props} />;
}

function FrequencyForm({
  isOpen, onClose, frequencyToEdit, activities, ruleTypes, onSubmit,
}: Props) {
  const f = frequencyToEdit;
  const [activityTypeItemId, setActivityTypeItemId] = useState(f ? f.activityType.id : activities[0]?.id ?? 0);
  const [regime, setRegime] = useState<MaintenanceRegime>(f ? f.regime : 'IN_HOUSE');
  const [ruleTypeCode, setRuleTypeCode] = useState<FrequencyRuleTypeCode>(f ? f.frequencyRuleType.code : 'INTERVAL_DAYS');
  const [scope, setScope] = useState<MaintenanceScope>(f ? f.scope : 'CAMPUS_WIDE');
  const [fields, setFields] = useState<RuleFieldsState>(() => (f ? fieldsFrom(f) : EMPTY_FIELDS));
  const [estimatedDuration, setEstimatedDuration] = useState(optionalText(f?.estimatedDurationDays));
  const [notes, setNotes] = useState(f?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchFields = (patch: Partial<RuleFieldsState>) =>
    setFields((prev) => ({ ...prev, ...patch }));

  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityOption[]> = {};
    for (const act of activities) {
      const key = act.parentCode || 'Otras actividades';
      (groups[key] ??= []).push(act);
    }
    return groups;
  }, [activities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { payload, error: validationError } = buildFrequencyPayload({
      activityTypeItemId,
      regime,
      ruleTypeCode,
      scope,
      fields,
      estimatedDuration,
      notes,
      isEditing: Boolean(frequencyToEdit),
    });
    if (validationError || !payload) {
      setError(validationError ?? 'Revisa los datos del formulario');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la frecuencia');
    } finally {
      setLoading(false);
    }
  };

  const creaVersionNueva = Boolean(frequencyToEdit && frequencyToEdit.validFrom < today());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={frequencyToEdit ? 'Editar frecuencia' : 'Nueva frecuencia de mantenimiento'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {creaVersionNueva && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Los periodos ya evaluados conservan la configuración anterior. Al guardar se crea una
            versión nueva vigente desde hoy, y el historial anterior queda intacto.
          </div>
        )}

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className={LABEL}>Actividad</span>
            <select
              value={activityTypeItemId}
              onChange={(e) => setActivityTypeItemId(Number(e.target.value))}
              disabled={Boolean(frequencyToEdit)}
              className={`${SELECT} disabled:bg-neutral-100 disabled:text-neutral-500`}
            >
              <option value={0}>Selecciona una actividad…</option>
              {Object.entries(groupedActivities).map(([grupo, items]) => (
                <optgroup key={grupo} label={grupo}>
                  {items.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {frequencyToEdit && (
              <span className="text-xs text-neutral-500 mt-1 block">
                La actividad es la identidad de la regla: para cambiarla, desactiva esta y crea otra.
              </span>
            )}
          </label>

          <label className="block">
            <span className={LABEL}>Modalidad de ejecución</span>
            <select value={regime} onChange={(e) => setRegime(e.target.value as MaintenanceRegime)} className={SELECT}>
              <option value="IN_HOUSE">Personal propio PUCP</option>
              <option value="OUTSOURCED">Servicio tercerizado</option>
            </select>
          </label>

          <label className="block">
            <span className={LABEL}>Ámbito</span>
            <select value={scope} onChange={(e) => setScope(e.target.value as MaintenanceScope)} className={SELECT}>
              <option value="CAMPUS_WIDE">Todo el campus</option>
              <option value="BY_SECTOR">Por sector</option>
              <option value="BY_ZONE">Por zona</option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className={LABEL}>Modelo de periodicidad</span>
            <select
              value={ruleTypeCode}
              onChange={(e) => setRuleTypeCode(e.target.value as FrequencyRuleTypeCode)}
              className={SELECT}
            >
              {ruleTypes.map((r) => (
                <option key={r.id} value={r.code}>{r.label}</option>
              ))}
            </select>
          </label>
        </div>

        <RuleTypeFields ruleTypeCode={ruleTypeCode} state={fields} onChange={patchFields} />

        <label className="block sm:w-1/2">
          <span className={LABEL}>Duración estimada (días)</span>
          <input
            type="number" min={1} value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(e.target.value)}
            placeholder="3" className={INPUT}
          />
        </label>

        <label className="block">
          <span className={LABEL}>Notas</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej. Teoría 21 días; el clima de Lima lo estira a 30-45"
            className={INPUT}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Guardando…' : frequencyToEdit ? 'Guardar versión' : 'Registrar frecuencia'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function num(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
