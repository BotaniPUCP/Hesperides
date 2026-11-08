'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { IrrigationPumpReadings } from '@shared/types/irrigation';
import { Button, Card, LoadingSkeleton } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { irrigationApi } from '@/lib/irrigation-api';
import { todayLocal } from '@/lib/local-date';

const FIELD = 'h-10 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600';
const amount = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });

export function IrrigationPumpReadingsCard({ canRecord }: { canRecord: boolean }) {
  const [data, setData] = useState<IrrigationPumpReadings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [readingDate, setReadingDate] = useState(todayLocal);
  const [initial, setInitial] = useState('');
  const [final, setFinal] = useState('');
  const [level, setLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; alert: boolean } | null>(null);
  const flow = data?.flowM3PerHour;
  const limit = data?.dailyLimitHours;
  const configured = flow != null && limit != null;

  useEffect(() => {
    let live = true;
    irrigationApi.pumpReadings()
      .then((response) => { if (live) setData(response); })
      .catch((error: unknown) => { if (live) setLoadError(mensajeDeApiError(error)); });
    return () => { live = false; };
  }, [revision]);

  function reload() {
    setLoadError(null);
    setRevision((value) => value + 1);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const reading = await irrigationApi.createPumpReading({
        readingDate, initialMeterHours: Number(initial), finalMeterHours: Number(final),
        reservoirLevelPercent: Number(level),
      });
      setData((previous) => previous && ({
        flowM3PerHour: reading.flowM3PerHour,
        dailyLimitHours: reading.dailyLimitHours,
        readings: [reading, ...previous.readings]
          .sort((a, b) => b.readingDate.localeCompare(a.readingDate)).slice(0, 30),
      }));
      setInitial('');
      setFinal('');
      setLevel('');
      setMessage({
        text: reading.exceedsDailyLimit
          ? 'Lectura guardada. Las horas de bombeo superan el límite diario.'
          : 'Lectura de bombeo guardada.',
        alert: reading.exceedsDailyLimit,
      });
    } catch (error) {
      setMessage({ text: mensajeDeApiError(error), alert: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Bomba del pozo y reservorio">
      <div className="space-y-4">
        {loadError ? <div role="alert" className="space-y-2 text-sm text-alert-danger-fg">
          <p>{loadError}</p>
          <Button type="button" variant="secondary" onClick={reload}>Reintentar</Button>
        </div> : !data && <LoadingSkeleton />}
        {data && (configured
          ? <p className="text-sm text-neutral-600">
              Caudal configurado: {amount.format(flow)} m³/h · Límite diario: {amount.format(limit)} h.
            </p>
          : <div className="space-y-2 text-sm text-neutral-700">
              <p>Para registrar lecturas, un administrador debe configurar el caudal y el límite diario en Administración → Parámetros.</p>
              <Button type="button" variant="secondary" onClick={reload}>Volver a comprobar</Button>
            </div>)}
        {configured && canRecord && <form onSubmit={save} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-sm"><span>Fecha de lectura</span>
              <input required type="date" className={FIELD} value={readingDate} onChange={(event) => setReadingDate(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm"><span>Horómetro inicial (h)</span>
              <input required type="number" min="0" max="999999999.999" step="0.001" className={FIELD}
                value={initial} onChange={(event) => setInitial(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm"><span>Horómetro final (h)</span>
              <input required type="number" min="0" max="999999999.999" step="0.001" className={FIELD}
                value={final} onChange={(event) => setFinal(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm"><span>Nivel del reservorio (%)</span>
              <input required type="number" min="0" max="100" step="0.001" className={FIELD}
                value={level} onChange={(event) => setLevel(event.target.value)} />
            </label>
          </div>
          <Button type="submit" loading={saving}>Guardar lectura de bombeo</Button>
        </form>}
        {message && <p role={message.alert ? 'alert' : 'status'} className="text-sm">{message.text}</p>}
        {data && data.readings.length === 0 && <p className="text-sm text-neutral-500">Todavía no hay lecturas registradas.</p>}
        {data && data.readings.length > 0 && <ul aria-label="Últimas 30 lecturas de bombeo" className="space-y-2">
          {data.readings.map((reading) => <li key={reading.id} className="rounded-md border border-neutral-200 p-3 text-sm">
            <p className="font-semibold">{reading.readingDate}</p>
            <p>{amount.format(reading.operationHours)} h de bombeo · {amount.format(reading.estimatedVolumeM3)} m³ estimados · Reservorio al {amount.format(reading.reservoirLevelPercent)} %</p>
            <p className="text-xs text-neutral-600">
              Horómetro: {amount.format(reading.initialMeterHours)}–{amount.format(reading.finalMeterHours)} h · Caudal: {amount.format(reading.flowM3PerHour)} m³/h · Límite: {amount.format(reading.dailyLimitHours)} h
            </p>
            {reading.exceedsDailyLimit && <p className="font-semibold text-alert-warning-fg">Superó el límite diario de bombeo.</p>}
          </li>)}
        </ul>}
      </div>
    </Card>
  );
}
