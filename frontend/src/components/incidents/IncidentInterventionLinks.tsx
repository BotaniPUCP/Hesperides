'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { IncidentDetail, IncidentInterventionLink, IncidentOptions, LinkedIncidentIntervention } from '@shared/types';
import { Button, Card, Input, Select, StatusBadge } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';
import { interventionsApi } from '@/lib/interventions-api';

export function IncidentInterventionLinks({ detail, options, coordinator, busy, selectedInterventionId, createHref, onLink, onRemove }: {
  detail: IncidentDetail; options: IncidentOptions | null; coordinator: boolean; busy: boolean;
  selectedInterventionId: number | null; createHref: string;
  onLink: (request: IncidentInterventionLink) => Promise<boolean>;
  onRemove: (linkId: number, reason: string) => Promise<boolean>;
}) {
  const editable = coordinator && detail.incident.approvedAt !== null && detail.incident.resolvedAt === null;
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<number | null>(selectedInterventionId);
  const [purpose, setPurpose] = useState('MITIGATION');
  const [legacyIds, setLegacyIds] = useState<number[]>([]);
  const [removeReasons,setRemoveReasons] = useState<Record<number,string>>({});
  const candidates = useRequest(editable ? `links:${detail.incident.id}:${query}:${page}:${revision}` : null,
    () => incidentsApi.interventionOptions(detail.incident.id, query, page));
  const chosen = useRequest(editable && selected ? `link-candidate:${detail.incident.id}:${selected}:${revision}` : null,
    () => interventionsApi.detail(selected!));
  const selectedWork: LinkedIncidentIntervention | null = chosen.data ? { ...chosen.data, linkId: null, purpose: null } : null;
  const label = (code: string) => options?.workStatuses.find((s) => s.code === code)?.label ?? code;
  const selections = [...(candidates.data?.content ?? [])];
  if (selectedWork && !selections.some((w) => w.id === selectedWork.id)) selections.unshift(selectedWork);
  const unmapped = detail.interventions.filter((w) => w.replacementInterventionId === null);
  return <Card title="Intervenciones requeridas">
    <div className="space-y-4">
      <p className="text-sm text-neutral-700">Se ejecutan y revisan en el módulo de intervenciones. Finalizada no significa validada. Una intervención puede atender varias incidencias.</p>
      {detail.linkedInterventions.length === 0 ? <p className="text-sm text-neutral-700">No hay intervenciones visibles vinculadas. El registro oficial no las exige; el cierre sí.</p> :
        <ul className="space-y-3">{detail.linkedInterventions.map((work) => <li key={work.linkId} className="space-y-2 rounded-md border border-neutral-200 p-3">
          <StatusBadge code={work.statusCode} label={label(work.statusCode)} />
          {work.code ? <Link href={`/intervenciones/${work.id}`} className="block break-words font-semibold text-brand-700 underline">{work.code} · {work.description || 'Ver intervención'}</Link>
            : <p>Intervención no disponible. El cierre permanecerá bloqueado.</p>}
          <p className="text-sm text-neutral-700">{work.purpose?.label} · {work.validatedLocationCount}/{work.locationCount} ubicaciones validadas</p>
          {editable && work.linkId !== null && ['PLANNED','ASSIGNED','CANCELLED'].includes(work.statusCode) && <div className="space-y-2">
            <Input id={`remove-link-${work.linkId}`} label={`Motivo para retirar vínculo ${work.code}`} size="lg" maxLength={2000}
              value={removeReasons[work.linkId] ?? ''} disabled={busy} onChange={(reason) => setRemoveReasons((r) => ({...r,[work.linkId!]:reason}))} />
            <Button type="button" size="lg" variant="secondary" disabled={busy || !removeReasons[work.linkId]?.trim()}
              onClick={() => void onRemove(work.linkId!,removeReasons[work.linkId!].trim())}>Retirar vínculo antes de ejecutar</Button>
          </div>}
        </li>)}</ul>}
      {detail.requiredInterventionCount > detail.linkedInterventions.length && <p className="text-sm text-neutral-700">Hay intervenciones vinculadas que no están disponibles para tu cuenta.</p>}
      {detail.interventions.length > 0 && <details className="rounded-md border border-neutral-200 p-3">
        <summary className="cursor-pointer py-2 text-sm font-medium">Trabajos del registro anterior (solo lectura)</summary>
        <p className="my-3 text-sm text-neutral-700">No son intervenciones validadas. Los casos abiertos necesitan asociarlos explícitamente a trabajo real, sin inventar ejecución ni ubicaciones.</p>
        <ul className="space-y-3">{detail.interventions.map((work) => <li key={work.id} className="whitespace-pre-wrap break-words text-sm">
          {work.description} · {work.status.label} · {work.replacementInterventionId ? `Asociado a intervención #${work.replacementInterventionId}` : 'Pendiente de asociación'}
        </li>)}</ul>
      </details>}
      {editable && <div className="space-y-4 border-t border-neutral-200 pt-4">
        <Link href={createHref} className="inline-flex min-h-12 items-center rounded-md border border-neutral-200 px-4 font-medium text-brand-700">Registrar nueva intervención</Link>
        <p className="text-sm text-neutral-700">Al guardar volverás aquí con la nueva intervención preseleccionada; confirma su vínculo a continuación.</p>
        <div className="space-y-3">
          <Input id="link-work-search" label="Buscar intervención por código o descripción" size="lg" value={search} onChange={setSearch} disabled={busy} maxLength={200} />
          <Button type="button" variant="secondary" size="lg" disabled={busy || candidates.loading} onClick={() => { setQuery(search.trim()); setPage(0); setRevision((v) => v + 1); }}>Buscar intervenciones</Button>
          {candidates.errorMessage && <p role="alert" className="text-sm text-action-danger">{candidates.errorMessage}</p>}
          <Select id="link-work" label="Intervención existente" size="lg" clearable disabled={busy || candidates.loading}
            value={selected?.toString() ?? null} options={selections.map((w) => ({ id: w.id, code: String(w.id), label: `${w.code} · ${label(w.statusCode)} · ${w.description ?? ''}` }))}
            onChange={(w) => setSelected(w?.id ?? null)} placeholder="Selecciona una intervención" />
          {chosen.errorMessage && <p role="alert" className="text-sm text-action-danger">{chosen.errorMessage}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="lg" variant="secondary" disabled={busy || page === 0} onClick={() => setPage((v) => v - 1)}>Anteriores intervenciones</Button>
            <span className="text-sm">Página {page + 1} · {candidates.data?.page.totalElements ?? 0} resultados</span>
            <Button type="button" size="lg" variant="secondary" disabled={busy || !candidates.data || page + 1 >= candidates.data.page.totalPages} onClick={() => setPage((v) => v + 1)}>Siguientes intervenciones</Button>
          </div>
          <Select id="link-purpose" label="Propósito para esta incidencia" size="lg" value={purpose} options={options?.matrix.actionPurposes ?? []}
            disabled={busy || !options} onChange={(p) => setPurpose(p?.code ?? 'MITIGATION')} />
          {unmapped.length > 0 && <fieldset disabled={busy} className="space-y-2">
            <legend className="text-sm font-medium">Este trabajo sustituye los siguientes registros anteriores</legend>
            {unmapped.map((w) => <label key={w.id} className="flex min-h-12 items-start gap-3 py-2 text-sm"><input type="checkbox" checked={legacyIds.includes(w.id)}
              onChange={(e) => setLegacyIds(e.target.checked ? [...legacyIds,w.id] : legacyIds.filter((id) => id !== w.id))} />{w.description}</label>)}
          </fieldset>}
          <Button type="button" size="lg" loading={busy} disabled={!selectedWork || !options || selectedWork.statusCode === 'CANCELLED'} onClick={async () => {
            if (!selectedWork) return;
            if (await onLink({ version: detail.incident.version, interventionId: selectedWork.id, interventionVersion: selectedWork.version,
              purposeCode: purpose, legacyWorkIds: legacyIds })) { setSelected(null); setLegacyIds([]); setRevision((v) => v + 1); }
          }}>Vincular intervención</Button>
        </div>
      </div>}
    </div>
  </Card>;
}
