'use client';

import React, { useState } from 'react';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import type {
  CreateMaintenanceFrequencyRequest,
  FrequencyRuleTypeCode,
  GreenAreaSetSummary,
  MaintenanceFrequency,
  MaintenanceRegime,
  MaintenanceScope,
  UpdateMaintenanceFrequencyRequest,
} from '@shared/types';
import { Button, Modal } from '@/components/ui';
import { buildFrequencyPayload } from './buildFrequencyPayload';
import { FrequencyActivitySelect, type ActivityOption } from './FrequencyActivitySelect';
import { EMPTY_FIELDS, fieldsFrom, optionalText, today } from './frequencyFormState';
import { FrequencyScopeFields } from './FrequencyScopeFields';
import { RuleTypeFields, type RuleFieldsState } from './RuleTypeFields';

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
  sets: GreenAreaSetSummary[];
  onSubmit: (payload: CreateMaintenanceFrequencyRequest | UpdateMaintenanceFrequencyRequest) => Promise<void>;
}

const INPUT = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-hidden';
const SELECT = `${INPUT} bg-neutral-0`;
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1';

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
  isOpen, onClose, frequencyToEdit, activities, ruleTypes, sets, onSubmit,
}: Props) {
  const f = frequencyToEdit;
  const [activityTypeItemId, setActivityTypeItemId] = useState(f ? f.activityType.id : activities[0]?.id ?? 0);
  const [regime, setRegime] = useState<MaintenanceRegime>(f ? f.regime : 'IN_HOUSE');
  const [ruleTypeCode, setRuleTypeCode] = useState<FrequencyRuleTypeCode>(f ? f.frequencyRuleType.code : 'INTERVAL_DAYS');
  const [scope, setScope] = useState<MaintenanceScope>(f ? f.scope : 'CAMPUS_WIDE');
  const [setId, setSetId] = useState<number | null>(f?.greenAreaSetId ?? null);
  const [fields, setFields] = useState<RuleFieldsState>(() => (f ? fieldsFrom(f) : EMPTY_FIELDS));
  const [estimatedDuration, setEstimatedDuration] = useState(optionalText(f?.estimatedDurationDays));
  const [notes, setNotes] = useState(f?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapshot = JSON.stringify([activityTypeItemId, regime, ruleTypeCode, scope, setId, fields, estimatedDuration, notes]);
  const [initial] = useState(snapshot);
  const guard = useUnsavedChangesGuard(snapshot !== initial);
  const cerrar = () => guard.confirm(onClose);

  const patchFields = (patch: Partial<RuleFieldsState>) =>
    setFields((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { payload, error: validationError } = buildFrequencyPayload({
      activityTypeItemId,
      regime,
      ruleTypeCode,
      scope,
      greenAreaSetId: setId,
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
    <>
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title={frequencyToEdit ? 'Editar frecuencia' : 'Nueva frecuencia de mantenimiento'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {creaVersionNueva && (
          <div className="rounded-md border border-alert-warning-border bg-alert-warning-bg p-3 text-xs text-alert-warning-fg">
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
          <FrequencyActivitySelect activities={activities} value={activityTypeItemId}
            onChange={setActivityTypeItemId} locked={Boolean(frequencyToEdit)} />

          <label className="block">
            <span className={LABEL}>Modalidad de ejecución</span>
            <select value={regime} onChange={(e) => setRegime(e.target.value as MaintenanceRegime)} className={SELECT}>
              <option value="IN_HOUSE">Personal propio PUCP</option>
              <option value="OUTSOURCED">Servicio tercerizado</option>
            </select>
          </label>

          <FrequencyScopeFields scope={scope} setId={setId} sets={sets} onScope={setScope} onSet={setSetId} />

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
            placeholder="Ej. En el verano de 2026 se cortó más seguido"
            className={INPUT}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={cerrar} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Guardando…' : frequencyToEdit ? 'Guardar versión' : 'Registrar frecuencia'}
          </Button>
        </div>
      </form>
    </Modal>
    {guard.dialog}
    </>
  );
}
