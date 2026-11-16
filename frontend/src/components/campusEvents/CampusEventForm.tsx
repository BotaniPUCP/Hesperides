'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CampusEvent, CampusEventRequest, CampusEventType } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, Input, Textarea } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { campusEventsApi } from '@/lib/campus-events-api';
import { todayInLima } from '@/lib/reservation-format';
import { summarize } from './campusEventFormat';
import { ScopePicker } from './ScopePicker';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DEFAULT_START = '14:00';
const DEFAULT_END = '18:00';

const blank = (): CampusEventRequest => {
  const today = todayInLima();
  return { name: '', description: null, typeCode: 'BLOCKING', scope: 'CAMPUS', zoneId: null, startDate: today,
    endDate: today, startTime: null, endTime: null, weekdays: [] };
};

const fieldClass = 'h-10 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-base text-neutral-900';

/** Registrar o editar un evento del calendario (SPEC-114 §5.1 y §5.3). Editar cambia todas sus ocurrencias. */
export function CampusEventForm({ event }: { event?: CampusEvent }) {
  const router = useRouter();
  const [form, setForm] = useState<CampusEventRequest>(() => event ? { ...event } : blank());
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<CampusEventRequest>) => setForm((f) => ({ ...f, ...patch }));
  const withHours = form.startTime !== null;

  function chooseType(typeCode: CampusEventType) {
    set(typeCode === 'HOLIDAY' ? { typeCode, scope: 'CAMPUS', zoneId: null } : { typeCode });
  }

  function toggleWeekday(day: number) {
    set({ weekdays: form.weekdays.includes(day) ? form.weekdays.filter((d) => d !== day) : [...form.weekdays, day].sort() });
  }

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError('');
    try {
      await action();
      router.push(`/calendario?mes=${form.startDate.slice(0, 7)}`);
    } catch (e) {
      setError(mensajeDeApiError(e));
      setPending(false);
    }
  }

  const save = () => run(() => event
    ? campusEventsApi.update(event.id, { ...form, version: event.version })
    : campusEventsApi.create(form));

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <PageHeader title={event ? 'Editar evento' : 'Registrar evento'}
        description="Un evento bloqueante o un feriado solo avisa a quien programa trabajo o reserva un jardín en esas fechas; nunca lo impide." />
      {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}

      <section className="surface-card space-y-4">
        <div role="group" aria-label="Tipo" className="flex gap-1">
          {(['BLOCKING', 'HOLIDAY'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={form.typeCode === t} onClick={() => chooseType(t)}
              className={`rounded-md px-3 py-1 text-sm ${form.typeCode === t ? 'bg-forest-700 text-white' : 'border border-neutral-200 hover:bg-neutral-50'}`}>
              {t === 'BLOCKING' ? 'Bloqueante' : 'Feriado'}
            </button>
          ))}
        </div>
        <Input id="campus-event-name" label="Nombre" required maxLength={150} value={form.name}
          placeholder={form.typeCode === 'HOLIDAY' ? 'Fiestas Patrias' : 'Examen de admisión 2027-1'}
          onChange={(name) => set({ name })} />
        <Textarea id="campus-event-description" label="Descripción (opcional)" rows={2} maxLength={500}
          value={form.description ?? ''} onChange={(description) => set({ description: description || null })} />
        <ScopePicker scope={form.scope} zoneId={form.zoneId} locked={form.typeCode === 'HOLIDAY'}
          onChange={(scope, zoneId) => set({ scope, zoneId })} />
      </section>

      <section className="surface-card space-y-4" aria-label="Fechas">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-neutral-700">Desde
            <input type="date" required value={form.startDate} className={fieldClass}
              onChange={(e) => set({ startDate: e.target.value, endDate: form.endDate < e.target.value ? e.target.value : form.endDate })} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-neutral-700">Hasta
            <input type="date" required value={form.endDate} min={form.startDate} className={fieldClass}
              onChange={(e) => set({ endDate: e.target.value })} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={withHours} className="accent-brand-600"
            onChange={(e) => set(e.target.checked ? { startTime: DEFAULT_START, endTime: DEFAULT_END } : { startTime: null, endTime: null })} />
          Con horario (sin horario, es el día entero)
        </label>
        {withHours && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-neutral-700">Hora de inicio
              <input type="time" required value={form.startTime ?? ''} className={fieldClass} onChange={(e) => set({ startTime: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-neutral-700">Hora de fin
              <input type="time" required value={form.endTime ?? ''} className={fieldClass} onChange={(e) => set({ endTime: e.target.value })} />
            </label>
          </div>
        )}
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium text-neutral-700">Repetir solo estos días (opcional)</legend>
          <div className="flex gap-1">
            {WEEKDAYS.map((label, i) => (
              <label key={label} title={WEEKDAY_NAMES[i]}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-sm font-semibold ${form.weekdays.includes(i + 1) ? 'bg-forest-700 text-white' : 'border border-neutral-200'}`}>
                <input type="checkbox" className="sr-only" aria-label={WEEKDAY_NAMES[i]} checked={form.weekdays.includes(i + 1)}
                  onChange={() => toggleWeekday(i + 1)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <p role="status" className="text-sm text-neutral-700">{summarize(form)}</p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>{event ? 'Guardar cambios' : 'Registrar evento'}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/calendario')}>Cancelar</Button>
        {event && !confirmDelete && (
          <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>Dar de baja</Button>
        )}
        {event && confirmDelete && (
          <span className="flex items-center gap-2 text-sm text-neutral-700">
            Se quitan todas sus fechas.
            <Button type="button" variant="danger" disabled={pending} onClick={() => run(() => campusEventsApi.remove(event.id))}>
              Sí, dar de baja
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>No</Button>
          </span>
        )}
      </div>
    </form>
  );
}
