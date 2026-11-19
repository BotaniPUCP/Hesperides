'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { GreenAreaSetSummary, MaintenanceFrequency, PlanningAssignment } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Badge, Button, Card, LoadingSkeleton } from '@/components/ui';
import { frequencySummary, scopeLabel } from '@/components/maintenance/frequencySummary';
import { useRequest } from '@/hooks/useRequest';
import { mensajeDeApiError } from '@/lib/api-errors';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { maintenanceApi } from '@/lib/maintenance-api';
import { planningApi } from '@/lib/planning-api';
import { contentsLabel } from './planningTexts';

const PLANNING_PATH = '/intervenciones/planificacion';
const NEW_FREQUENCY_PATH = '/intervenciones/frecuencias/nueva';
const FIELD = 'w-full rounded-md border border-neutral-300 bg-neutral-0 px-3 py-2 text-sm focus:border-primary-500 focus:outline-hidden';
const LABEL = 'mb-1 block text-sm font-medium text-neutral-700';

async function load() {
  const [sets, frequencies, assignments] = await Promise.all([
    greenAreaSetsApi.list(), maintenanceApi.list({ active: true }), planningApi.assignments.list()]);
  return { sets, frequencies: frequencies.filter((f) => f.current), assignments };
}

/** Por qué una frecuencia no se puede planificar; null si se puede (D-10). */
function blocked(f: MaintenanceFrequency): string | null {
  if (f.regime === 'OUTSOURCED') return 'tercerizada, no se planifica';
  if (f.frequencyRuleType.code === 'ON_DEMAND') return 'a demanda, no se planifica';
  return null;
}

/** Las de todo el campus primero: es la que rige por defecto. */
const campusFirst = (a: MaintenanceFrequency, b: MaintenanceFrequency) =>
  (a.scope === b.scope ? 0 : a.scope === 'CAMPUS_WIDE' ? -1 : 1);

/**
 * La que se propone: la que ya usa la planificación si existe; si no, la de todo el campus;
 * si no hay, la primera que se pueda planificar.
 */
function proposed(options: MaintenanceFrequency[], current: PlanningAssignment | null): MaintenanceFrequency | null {
  const plannable = options.filter((f) => !blocked(f));
  return plannable.find((f) => current?.ruleKey === f.ruleKey) ?? plannable[0] ?? null;
}

/**
 * Nueva planificación o editar una ({@code /planificacion/<id>}): un conjunto, una actividad y, de las
 * frecuencias de esa actividad, cuál rige allí (SPEC-203 D-16). Una planificación por conjunto y
 * actividad: si ya existe, se edita esa en vez de crear otra.
 */
export function PlanningFormScreen({ assignmentId = null }: { assignmentId?: number | null }) {
  const router = useRouter();
  const editingId = assignmentId;
  const data = useRequest('planning-form', load);
  const editing = data.data?.assignments.find((a) => a.id === editingId) ?? null;
  const [setId, setSetId] = useState<number | null>(null);
  const [activityId, setActivityId] = useState<number | null>(null);
  const [frequencyId, setFrequencyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const all = useMemo(() => data.data?.frequencies ?? [], [data.data]);
  const activities = [...new Map(all.map((f) => [f.activityType.id, f.activityType.label])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'es'));
  const chosenSetId = editing?.setId ?? setId;
  const chosenActivityId = editing?.activityTypeItemId ?? activityId;
  const options = all.filter((f) => f.activityType.id === chosenActivityId).sort(campusFirst);
  /** Si el conjunto ya tiene esa actividad, se edita esa planificación en vez de crear otra. */
  const existing: PlanningAssignment | null = !editing && chosenSetId && chosenActivityId
    ? data.data?.assignments.find((a) => a.setId === chosenSetId && a.activityTypeItemId === chosenActivityId) ?? null
    : null;
  const target = editing ?? existing;
  const chosen = options.find((f) => f.id === frequencyId) ?? proposed(options, target);
  /** Dejar la frecuencia que ya tiene no cambia nada: no se guarda. */
  const unchanged = Boolean(target && chosen && target.ruleKey === chosen.ruleKey);
  const activityLabel = activities.find(([id]) => id === chosenActivityId)?.[1] ?? '';

  const save = async () => {
    if (!chosenSetId || !chosenActivityId) {
      setError('Elige el conjunto y la actividad.');
      return;
    }
    if (!chosen) {
      setError(`${activityLabel} no tiene una frecuencia que se pueda planificar.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = target
        ? await planningApi.assignments.change(target.id, { frequencyId: chosen.id })
        : await planningApi.assignments.create({ setId: chosenSetId, frequencyId: chosen.id });
      if (saved.warnings.length > 0) setWarnings(saved.warnings);
      else router.push(PLANNING_PATH);
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (data.errorMessage) return <p role="alert" className="text-sm text-action-danger">{data.errorMessage}</p>;
  if (!data.data) return <LoadingSkeleton />;
  if (editingId && !editing) return <p role="alert" className="text-sm text-action-danger">Esa planificación ya no existe.</p>;

  return (
    <section className="space-y-6">
      <PageHeader title={editing ? `Editar planificación · ${editing.activityLabel} en ${editing.setName}` : 'Nueva planificación'}
        description={editing ? undefined : 'Qué actividad se planifica en un conjunto de áreas verdes y cada cuánto se hace.'} />
      {/* Una columna de lectura: a todo el ancho, los selectores y las opciones quedaban casi vacíos. */}
      <div className="max-w-3xl space-y-6">
        <Card title="Qué y dónde">
          {editing ? (
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-neutral-500">Conjunto</dt><dd className="font-medium text-neutral-900">{editing.setName}</dd></div>
              <div><dt className="text-neutral-500">Actividad</dt><dd className="font-medium text-neutral-900">{editing.activityLabel}</dd></div>
            </dl>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>Conjunto</span>
                <select value={setId ?? 0} onChange={(e) => setSetId(Number(e.target.value) || null)} className={FIELD}>
                  <option value={0}>Elige un conjunto…</option>
                  {data.data.sets.map((s: GreenAreaSetSummary) => (
                    <option key={s.id} value={s.id}>{s.name} · {contentsLabel(s.zoneCount, s.elementCount)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={LABEL}>Actividad</span>
                {/* Otra actividad tiene otras frecuencias: la elegida antes ya no vale. */}
                <select value={activityId ?? 0} onChange={(e) => { setActivityId(Number(e.target.value) || null); setFrequencyId(null); }} className={FIELD}>
                  <option value={0}>Elige una actividad…</option>
                  {activities.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
            </div>
          )}
        </Card>

        <Card title="Cada cuánto se hace" actions={
          <Link href={NEW_FREQUENCY_PATH} className="text-sm font-medium text-brand-700 underline underline-offset-2">Crear frecuencia</Link>}>
          {!chosenActivityId ? <p className="text-sm text-neutral-500">Elige primero la actividad: aquí aparecen sus frecuencias.</p>
            : options.length === 0 ? <p className="text-sm text-neutral-500">{activityLabel} no tiene frecuencias vigentes.</p> : (
              <div role="radiogroup" aria-label={`Frecuencias de ${activityLabel}`} className="space-y-1">
                <p className="mb-2 text-xs text-neutral-500">
                  {options.length === 1 ? `La frecuencia de ${activityLabel}.` : `${activityLabel} tiene varias: se propone la de todo el campus.`}
                </p>
                {options.map((f) => {
                  const reason = blocked(f);
                  const checked = chosen?.id === f.id;
                  return (
                    <label key={f.id} className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${reason ? 'cursor-not-allowed border-neutral-200 text-neutral-400' : checked ? 'cursor-pointer border-brand-600 bg-brand-50' : 'cursor-pointer border-neutral-200 hover:bg-neutral-50'}`}>
                      <input type="radio" name="frequency" value={f.id} disabled={Boolean(reason)} checked={checked}
                        onChange={() => setFrequencyId(f.id)} className="accent-brand-600" />
                      <span className="flex-1">{frequencySummary(f).main}</span>
                      <Badge label={scopeLabel(f.scope)} color={f.scope === 'CAMPUS_WIDE' ? 'neutral' : 'brand'} />
                      {reason && <span className="text-xs">{reason}</span>}
                    </label>
                  );
                })}
              </div>
            )}
        </Card>

        {unchanged && !editing ? (
          <p role="status" className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            Este conjunto ya tiene esta planificación de {activityLabel}, con esta misma frecuencia.
          </p>
        ) : existing && (
          <p role="status" className="rounded-md bg-alert-warning-bg px-3 py-2 text-sm text-alert-warning-fg">
            Este conjunto ya tiene una planificación de {activityLabel}. Al guardar se edita esa.
          </p>
        )}
        {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
        {warnings.length > 0 && (
          <div role="status" className="space-y-2 rounded-md bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
            <p className="font-semibold">Se guardó, con estos avisos:</p>
            <ul className="list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            <Link href={PLANNING_PATH} className="underline">Volver a planificación</Link>
          </div>
        )}
        {warnings.length === 0 && (
          <div className="flex justify-end gap-3">
            <Link href={PLANNING_PATH} className="inline-flex h-10 items-center rounded-md border border-neutral-200 px-4 text-sm text-neutral-700 hover:bg-neutral-50">Cancelar</Link>
            <Button onClick={save} loading={saving} disabled={unchanged}>{target ? 'Guardar cambios' : 'Guardar planificación'}</Button>
          </div>
        )}
      </div>
    </section>
  );
}
