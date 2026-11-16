'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { IncidentRef } from '@shared/types';
import { Button, Input } from '@/components/ui';
import { incidentsApi } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import type { InterventionSourceIncident } from '@/lib/interventions-api';
import { InterventionIncidentPicker } from './InterventionIncidentPicker';

/**
 * Las incidencias que atiende esta intervención: el mismo vínculo que se ve desde cada incidencia
 * (SPEC-201 §3.8). Validar la intervención no cierra sus incidencias.
 */
export function InterventionIncidentLinks({ interventionId, incidents, canManage, onChanged }: {
  interventionId: number; incidents: InterventionSourceIncident[]; canManage: boolean; onChanged: () => void;
}) {
  const [adding, setAdding] = useState<IncidentRef[]>([]);
  const [removing, setRemoving] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); setAdding([]); setRemoving(null); setReason(''); onChanged(); }
    catch (ex) { setError(mensajeDeApiError(ex)); }
    finally { setBusy(false); }
  };
  if (!incidents.length && !canManage) return null;
  return <div className="space-y-3">
    <p className="font-medium">Incidencias que atiende</p>
    {incidents.length === 0 ? <p className="text-sm text-neutral-700">Ninguna vinculada.</p> :
      <ul className="space-y-2">{incidents.map((i) => <li key={i.id} className="space-y-2">
        <Link className="text-brand-700 underline" href={`/incidencias/${i.id}`}>{i.code}{i.title ? ` · ${i.title}` : ''}</Link>
        {canManage && i.linkId !== null && removing !== i.linkId && <Button type="button" variant="ghost" size="md" disabled={busy}
          onClick={() => { setRemoving(i.linkId); setReason(''); }}>Quitar vínculo con {i.code}</Button>}
        {removing === i.linkId && <div className="space-y-2 rounded-md bg-neutral-50 p-3">
          <Input id={`work-incident-reason-${i.linkId}`} label="Motivo" size="lg" value={reason} maxLength={2000} disabled={busy} onChange={setReason} />
          <Button type="button" variant="secondary" size="lg" disabled={busy || !reason.trim()}
            onClick={() => void run(() => incidentsApi.unlinkFromWork(interventionId, i.linkId!, reason.trim()))}>Confirmar que se quita</Button>
        </div>}
      </li>)}</ul>}
    {canManage && <div className="space-y-2">
      <InterventionIncidentPicker value={adding} onChange={setAdding} disabled={busy} />
      <Button type="button" size="lg" disabled={busy || adding.length === 0}
        onClick={() => void run(async () => { for (const i of adding) await incidentsApi.linkFromWork(interventionId, i.id); })}>
        Vincular incidencias</Button>
    </div>}
    {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
    <p className="text-sm text-neutral-700">Validar esta intervención no cierra sus incidencias: coordinación cierra cada una por separado.</p>
  </div>;
}
