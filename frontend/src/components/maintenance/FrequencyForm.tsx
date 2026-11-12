'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import type {
  CreateMaintenanceFrequencyRequest,
  FrequencyRuleTypeCode,
  MaintenanceFrequency,
  MaintenanceRegime,
  MaintenanceScope,
  UpdateMaintenanceFrequencyRequest,
} from '@shared/types';
import { Button, Card } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { todayLocal } from '@/lib/local-date';
import { buildFrequencyPayload } from './buildFrequencyPayload';
import { FrequencyActivitySelect, type ActivityOption } from './FrequencyActivitySelect';
import { FrequencyChoice } from './FrequencyChoice';
import { EMPTY_FIELDS, fieldsFrom, optionalText } from './frequencyFormState';
import { FREQUENCIES_PATH } from './frequencyListState';
import { FrequencyScopeFields, planningOfActivity, planningsLabel } from './FrequencyScopeFields';
import { NUMBER, RuleTypeFields, type RuleFieldsState } from './RuleTypeFields';

export interface RuleTypeOption {
  id: number;
  code: string;
  label: string;
}

interface Props {
  frequencyToEdit?: MaintenanceFrequency | null;
  activities: ActivityOption[];
  ruleTypes: RuleTypeOption[];
  /** Guarda y devuelve el aviso para la lista; el formulario vuelve a ella. */
  onSubmit: (payload: CreateMaintenanceFrequencyRequest | UpdateMaintenanceFrequencyRequest) => Promise<void>;
  /** Solo al editar. Devuelve si se desactivó: la persona puede cancelar la confirmación. */
  onDeactivate?: (frequency: MaintenanceFrequency) => Promise<boolean>;
}

const INPUT = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-hidden';
const SELECT = `${INPUT} bg-neutral-0`;
const LABEL = 'mb-1 block text-sm font-medium text-neutral-700';

/** Crear o editar una frecuencia en su propia página (SPEC-203). Al terminar vuelve a la lista. */
export function FrequencyForm({ frequencyToEdit, activities, ruleTypes, onSubmit, onDeactivate }: Props) {
  const f = frequencyToEdit;
  const [activityTypeItemId, setActivityTypeItemId] = useState(f ? f.activityType.id : 0);
  const [regime, setRegime] = useState<MaintenanceRegime>(f ? f.regime : 'IN_HOUSE');
  const [ruleTypeCode, setRuleTypeCode] = useState<FrequencyRuleTypeCode>(f ? f.frequencyRuleType.code : 'INTERVAL_DAYS');
  // Lo más común: personal propio, y una frecuencia para solo algunas áreas.
  const [scope, setScope] = useState<MaintenanceScope>(f ? f.scope : 'BY_SET');
  const [fields, setFields] = useState<RuleFieldsState>(() => (f ? fieldsFrom(f) : EMPTY_FIELDS));
  const [estimatedDuration, setEstimatedDuration] = useState(optionalText(f?.estimatedDurationDays));
  const [notes, setNotes] = useState(f?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapshot = JSON.stringify([activityTypeItemId, regime, ruleTypeCode, scope, fields, estimatedDuration, notes]);
  const [initial] = useState(snapshot);
  const guard = useUnsavedChangesGuard(snapshot !== initial);
  const leave = () => guard.navigate(FREQUENCIES_PATH);

  const patchFields = (patch: Partial<RuleFieldsState>) => setFields((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { payload, error: validationError } = buildFrequencyPayload({
      activityTypeItemId, regime, ruleTypeCode, scope, fields, estimatedDuration, notes, isEditing: Boolean(f),
    });
    if (validationError || !payload) {
      setError(validationError ?? 'Revisa los datos del formulario');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(payload);
      leave();
    } catch (err: unknown) {
      setError(mensajeDeApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const creaVersionNueva = Boolean(f && f.validFrom < todayLocal());

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        {creaVersionNueva && (
          <div className="rounded-md border border-alert-warning-border bg-alert-warning-bg p-3 text-xs text-alert-warning-fg">
            Los periodos ya evaluados conservan la configuración anterior. Al guardar se crea una
            versión nueva vigente desde hoy, y el historial anterior queda intacto.
          </div>
        )}
        {/* Editar una frecuencia cambia todas las planificaciones que la usan: se avisa antes de guardar. */}
        {f && f.assignedSetCount > 0 && (
          <div role="note" className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            Esta frecuencia se usa en {planningsLabel(f.assignedSetCount)}: el cambio vale para {f.assignedSetCount === 1 ? 'ella' : 'todas'}.{' '}
            <Link href={planningOfActivity(f.activityType.id)} className="font-medium text-brand-700 underline underline-offset-2">
              Ver en Planificación</Link>
          </div>
        )}

        {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FrequencyActivitySelect activities={activities} value={activityTypeItemId}
            onChange={setActivityTypeItemId} locked={Boolean(f)} />

          <FrequencyChoice legend="Modalidad de ejecución" name="frequency-regime" value={regime} onChange={setRegime}
            options={[{ value: 'IN_HOUSE', label: 'Personal propio PUCP' }, { value: 'OUTSOURCED', label: 'Servicio tercerizado' }]}
            hint={regime === 'OUTSOURCED' ? 'Las tercerizadas no se planifican.' : undefined} />

          <FrequencyScopeFields scope={scope} onScope={setScope} />

          <label className="block">
            <span className={LABEL}>Tipo de frecuencia</span>
            <select value={ruleTypeCode} onChange={(e) => setRuleTypeCode(e.target.value as FrequencyRuleTypeCode)} className={SELECT}>
              {ruleTypes.map((r) => <option key={r.id} value={r.code}>{r.label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className={LABEL}>Duración estimada (días)</span>
            <input type="number" min={1} value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)}
              placeholder="3" className={NUMBER} />
          </label>
        </div>

        <RuleTypeFields ruleTypeCode={ruleTypeCode} state={fields} onChange={patchFields} />

        <label className="block">
          <span className={LABEL}>Notas</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Ej. En el verano de 2026 se cortó más seguido" className={INPUT} />
        </label>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {f && onDeactivate && (
            <Button type="button" variant="danger" disabled={loading}
              onClick={async () => { if (await onDeactivate(f)) leave(); }}>
              Desactivar frecuencia
            </Button>
          )}
          <span className="flex-1" />
          <Button type="button" variant="secondary" onClick={() => guard.confirm(leave)} disabled={loading}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Guardando…' : f ? 'Guardar versión' : 'Registrar frecuencia'}
          </Button>
        </div>
      </form>
      {guard.dialog}
    </Card>
  );
}
