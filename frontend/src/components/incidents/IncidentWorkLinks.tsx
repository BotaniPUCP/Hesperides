'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { IncidentDetail, LinkedIncidentIntervention } from '@shared/types';
import { Button, Card, Input, StatusBadge } from '@/components/ui';
import { InterventionPicker } from './InterventionPicker';

import { activityStatus, activityStatusLabel } from '@/components/interventions/activityPresentation';

/** Una acción sobre un vínculo: quitarlo, o quitarlo y vincular otra en un paso. */
function LinkAction({ work, replace, busy, onRemove, onReplace }: {
  work: LinkedIncidentIntervention; replace: boolean; busy: boolean;
  onRemove: (reason: string) => Promise<boolean>; onReplace: (interventionId: number, reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState('');
  const [replacement, setReplacement] = useState<number | null>(null);
  return <div className="space-y-3 rounded-md bg-neutral-50 p-3">
    {replace && <InterventionPicker value={replacement} onChange={setReplacement} disabled={busy} />}
    <Input id={`link-reason-${work.linkId}`} label="Motivo" size="lg" value={reason} maxLength={2000} disabled={busy} onChange={setReason} />
    <Button type="button" size="lg" variant="secondary" disabled={busy || !reason.trim() || (replace && replacement === null)}
      onClick={() => void (replace ? onReplace(replacement!, reason.trim()) : onRemove(reason.trim()))}>
      {replace ? 'Confirmar reemplazo' : 'Confirmar que se quita'}</Button>
  </div>;
}

/** El mismo vínculo que se ve desde Intervenciones (SPEC-201 §3.8). */
export function IncidentWorkLinks({ detail, busy, createHref, onLink, onRemove, onReplace }: {
  detail: IncidentDetail; busy: boolean; createHref: string;
  onLink: (interventionId: number) => Promise<boolean>;
  onRemove: (linkId: number, reason: string) => Promise<boolean>;
  onReplace: (linkId: number, interventionId: number, reason: string) => Promise<boolean>;
}) {
  const canLink = detail.capabilities.canLink;
  const [selected, setSelected] = useState<number | null>(null);
  const [action, setAction] = useState<{ linkId: number; replace: boolean } | null>(null);
  return <Card title="Actividades vinculadas">
    <div className="space-y-4">
      <p className="text-sm text-neutral-700">Se ejecutan y aprueban en Actividades. La incidencia se resuelve por separado, cuando el trabajo requerido ha terminado.</p>
      {detail.linkedInterventions.length === 0 ? <p className="text-sm text-neutral-700">Aún no hay actividades vinculadas.</p> :
        <ul className="space-y-3">{detail.linkedInterventions.map((work) => <li key={work.linkId} className="space-y-2 rounded-md border border-neutral-200 p-3">
          <StatusBadge code={activityStatus(work.statusCode)} label={work.statusCode==='UNAVAILABLE'?'No disponible':activityStatusLabel(work.statusCode)} />
          {work.code ? <Link href={`/intervenciones/${work.id}`} className="block break-words font-semibold text-brand-700 underline">
            {work.code} · {work.description || 'Ver actividad'}</Link> : <p>Actividad no disponible.</p>}
          <p className="text-sm text-neutral-700">{work.validatedLocationCount}/{work.locationCount} objetivos aprobados</p>
          {canLink && work.linkId !== null && <div className="flex flex-wrap gap-2">
            {work.statusCode === 'CANCELLED' && <Button type="button" size="lg" variant="secondary" disabled={busy}
              onClick={() => setAction({ linkId: work.linkId!, replace: true })}>Reemplazar {work.code}</Button>}
            <Button type="button" size="lg" variant="ghost" disabled={busy}
              onClick={() => setAction({ linkId: work.linkId!, replace: false })}>Quitar vínculo</Button>
          </div>}
          {action?.linkId === work.linkId && <LinkAction work={work} replace={action.replace} busy={busy}
            onRemove={(reason) => onRemove(work.linkId!, reason)}
            onReplace={(id, reason) => onReplace(work.linkId!, id, reason)} />}
        </li>)}</ul>}
      {canLink && !action && <div className="space-y-3 border-t border-neutral-200 pt-4">
        <Link href={createHref} className="inline-flex min-h-12 items-center rounded-md border border-neutral-200 px-4 font-medium text-brand-700">
          Crear actividad para esta incidencia</Link>
        <InterventionPicker value={selected} onChange={setSelected} disabled={busy} />
        <Button type="button" size="lg" disabled={busy || selected === null}
          onClick={async () => { if (selected !== null && await onLink(selected)) setSelected(null); }}>Vincular actividad</Button>
      </div>}
    </div>
  </Card>;
}
