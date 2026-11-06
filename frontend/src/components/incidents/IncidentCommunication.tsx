'use client';

import { useRef, useState } from 'react';
import type { IncidentUpdate } from '@shared/types';
import { Button, Card, Textarea } from '@/components/ui';
import { newClientReference } from '@/lib/incidents-api';
import { incidentDate } from '@/lib/incidentNavigation';

function ReviewChanges({ body }: { body: string }) {
  let change: { before: Record<string, unknown>; after: Record<string, unknown> } | null = null;
  try {
    const parsed = JSON.parse(body);
    if (parsed?.before && parsed?.after) change = parsed;
  } catch { /* Older entries can omit structured change details. */ }
  if (!change) return <p>Datos de atención revisados.</p>;
  const labels: Record<string, string> = { description: 'Descripción', locationReference: 'Referencia', latitude: 'Latitud', longitude: 'Longitud',
    type: 'Categoría operativa', urgency: 'Urgencia', team: 'Cuadrilla', service: 'Servicio', company: 'Empresa',
    process: 'Proceso N2', subprocess: 'Subproceso', severity: 'Severidad', impacts: 'Impactos', responsible: 'Responsable',
    immediateAction: 'Acción inmediata', rootCauseItem: 'Causa catalogada', rootCause: 'Causa detallada',
    preventiveAction: 'Prevención / mejora', impactedProcess: 'Proceso impactado', observations: 'Observaciones',
    event:'Tipo de evento',intakeChannel:'Canal de ingreso',reporterName:'Reportado por',zone:'Sección' };
  const format = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return 'Sin determinar';
    if (Array.isArray(value)) return value.map(format).join(', ') || 'Sin determinar';
    if (typeof value === 'object') { const item = value as { label?: string; fullName?: string }; return item.label ?? item.fullName ?? 'Sin determinar'; }
    return String(value);
  };
  const before = { ...change.before, ...((change.before.matrix as object) ?? {}) };
  const after = { ...change.after, ...((change.after.matrix as object) ?? {}) };
  const fields = Object.keys(labels).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  if (fields.length === 0) return <p>Revisión confirmada sin cambios de datos.</p>;
  return <details><summary className="cursor-pointer text-brand-700">Ver cambios de la revisión</summary>
    <dl className="mt-2 space-y-3 rounded-md bg-neutral-50 p-3">{fields.map((key) => <div key={key}>
      <dt className="font-medium">{labels[key]}</dt><dd className="whitespace-pre-wrap break-words">{format(before[key])} → {format(after[key])}</dd>
    </div>)}</dl></details>;
}

export function IncidentCommunication({ updates, busy, onComment }: {
  updates: IncidentUpdate[]; busy: boolean; onComment: (body: string, reference: string) => Promise<boolean>;
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const attempt = useRef<{ body: string; reference: string } | null>(null);
  return <Card title="Comunicación y seguimiento">
    <p className="mb-4 text-sm text-neutral-700">Reporta avances y coordinaciones aquí para conservarlos junto a la incidencia. Un comentario no completa una acción.</p>
    {updates.length > 0 ? <ol className="mb-5 space-y-4">{updates.map((update) => <li key={update.id} className="space-y-2 border-l-2 border-neutral-200 pl-3 text-sm">
      <p className="font-semibold">{update.kind.label} · {update.author.fullName}</p>
      <p className="text-neutral-700">{incidentDate(update.createdAt)}</p>
      {['REVIEW','REPORT_RESUBMITTED'].includes(update.kind.code) ? <ReviewChanges body={update.body} /> : <p className="whitespace-pre-wrap break-words">{update.body}</p>}
    </li>)}</ol> : <p className="mb-4 text-sm text-neutral-700">Todavía no hay actualizaciones.</p>}
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      const trimmed = body.trim();
      if (!trimmed) { setError('Escribe un comentario.'); return; }
      setError('');
      if (attempt.current?.body !== trimmed) attempt.current = { body: trimmed, reference: newClientReference() };
      if (await onComment(trimmed, attempt.current.reference)) { setBody(''); attempt.current = null; }
    }}>
      <Textarea id="incident-comment" label="Comentario o actualización" value={body} required disabled={busy} maxLength={10000}
        errorMessage={error} onChange={(v) => { setBody(v); setError(''); }} />
      <Button type="submit" size="lg" loading={busy}>Enviar comentario</Button>
    </form>
  </Card>;
}
