'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { IncidentDetail, IncidentInterventionLink, IncidentOptions, LinkedIncidentIntervention } from '@shared/types';
import { Button, Card, Modal, Select, StatusBadge, Textarea } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { interventionsApi } from '@/lib/interventions-api';
import { IncidentWorkSearch } from './IncidentWorkSearch';

export function IncidentInterventionLinks({ detail, options, coordinator, busy, selectedInterventionId, createHref, onLink, onRemove }: {
  detail: IncidentDetail; options: IncidentOptions | null; coordinator: boolean; busy: boolean;
  selectedInterventionId: number | null; createHref: string;
  onLink: (request: IncidentInterventionLink) => Promise<boolean>;
  onRemove: (linkId: number, reason: string) => Promise<boolean>;
}) {
  const editable = detail.canLinkInterventions;
  const [selected, setSelected] = useState<LinkedIncidentIntervention | null>(null);
  const [returnedId, setReturnedId] = useState(selectedInterventionId);
  const [purpose, setPurpose] = useState('MITIGATION');
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const chosen = useRequest(editable && returnedId ? `link-return:${detail.incident.id}:${returnedId}` : null, () => interventionsApi.detail(returnedId!));
  const work = selected ?? (chosen.data ? { ...chosen.data, linkId: null, purpose: null } : null);
  const label = (code: string) => options?.workStatuses.find(s => s.code === code)?.label ?? code;
  return <Card title="Intervenciones relacionadas">
    <div className="space-y-5">
      {!detail.linkedInterventions.length ? <p className="text-sm text-neutral-700">Aún no hay intervenciones relacionadas. Puedes registrar el caso sin ellas.</p> :
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">{detail.linkedInterventions.map(item => <li key={item.linkId} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">{item.code ? <Link href={`/intervenciones/${item.id}`} className="break-words font-semibold text-brand-800 hover:underline">{item.code} · {item.description || 'Ver intervención'}</Link> : <p>Intervención no disponible. El cierre permanecerá bloqueado.</p>}
            <p className="mt-1 text-sm text-neutral-700">{item.purpose?.label} · {item.validatedLocationCount}/{item.locationCount} ubicaciones validadas</p></div>
          <StatusBadge code={item.statusCode} label={label(item.statusCode)} />
          {editable && item.linkId !== null && ['PLANNED','ASSIGNED','CANCELLED'].includes(item.statusCode) && <Button variant="ghost" disabled={busy} aria-label={`Retirar relación ${item.code}`}
            onClick={() => { setReason(''); setRemoveId(item.linkId); }}>×</Button>}
        </li>)}</ul>}
      {detail.requiredInterventionCount > detail.linkedInterventions.length && <p className="text-sm text-neutral-700">Hay intervenciones vinculadas que no están disponibles para tu cuenta.</p>}
      {editable && <>
        <IncidentWorkSearch incidentId={detail.incident.id} scopeKey={`detail-${detail.incident.id}-${detail.incident.version}`} disabled={busy}
          statuses={options?.workStatuses}
          excludedIds={[...detail.linkedInterventions.map(w => w.id), ...(work ? [work.id] : [])]} onSelect={(next) => { setReturnedId(null); setSelected(next); }}
          creationAction={detail.canCreateIntervention ? <Link href={createHref} className="inline-flex min-h-12 items-center rounded-md bg-brand-600 px-4 font-semibold text-white hover:bg-forest-700">Nueva intervención ↗</Link> : undefined} />
        {chosen.loading && <p role="status">Cargando la intervención creada…</p>}
        {(chosen.errorMessage || chosen.notFound) && <p role="alert" className="text-alert-danger-fg">{chosen.errorMessage ?? 'La intervención no está disponible para tu cuenta.'}</p>}
        {work && <div className="space-y-3 rounded-lg border border-brand-200 bg-brand-50 p-4">
          <div className="flex items-center justify-between gap-3"><p className="min-w-0 break-words font-medium">Por relacionar: {work.code} · {work.description}</p>
            <Button variant="ghost" disabled={busy} aria-label={`Quitar selección ${work.code}`} onClick={() => { setSelected(null); setReturnedId(null); }}>×</Button></div>
          <Select id="link-purpose" label="Propósito para esta incidencia" size="lg" value={purpose} options={options?.matrix.actionPurposes ?? []}
            disabled={busy || !options} onChange={(p) => setPurpose(p?.code ?? 'MITIGATION')} />
          <Button loading={busy} disabled={!options || work.statusCode === 'CANCELLED'} onClick={async () => {
            if (await onLink({ version: detail.incident.version, interventionId: work.id, interventionVersion: work.version, purposeCode: purpose })) { setSelected(null); setReturnedId(null); }
          }}>Vincular intervención</Button>
        </div>}
        {!coordinator && <p className="text-sm text-neutral-700">Puedes relacionar trabajos de las cuadrillas que supervisas. Si aún no existen, coordinación debe planificarlos.</p>}
      </>}
      <p className="text-sm text-neutral-700">Finalizada no significa validada. El cierre requiere que todas las intervenciones requeridas estén validadas.</p>
    </div>
    <Modal isOpen={removeId !== null} onClose={() => { if (!busy) setRemoveId(null); }} title="Retirar relación">
      <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (removeId !== null && reason.trim() && await onRemove(removeId, reason.trim())) setRemoveId(null); }}>
        <p className="text-sm text-neutral-700">Se retira el vínculo antes de ejecutar. La intervención se conserva.</p>
        <Textarea id="remove-link-reason" label="Motivo" value={reason} onChange={setReason} required disabled={busy} maxLength={2000} />
        <Button type="submit" loading={busy} disabled={!reason.trim()}>Retirar relación</Button>
      </form>
    </Modal>
  </Card>;
}
