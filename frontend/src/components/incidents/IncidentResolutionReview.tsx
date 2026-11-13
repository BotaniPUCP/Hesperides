'use client';

import { useState } from 'react';
import type { IncidentDetail } from '@shared/types';
import { Button, Card, Textarea } from '@/components/ui';

export function IncidentResolutionReview({ detail, busy, onResolve, onObserve }: {
  detail: IncidentDetail; busy: boolean; onResolve: (summary: string) => Promise<boolean>; onObserve: (reason: string) => Promise<boolean>;
}) {
  const [summary, setSummary] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const closed = detail.incident.resolvedAt !== null;
  return <Card title="Revisión final de la resolución">
    <div className="space-y-5">
      {!closed && <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault(); if (!summary.trim()) { setError('Describe brevemente cómo se resolvió la incidencia.'); return; }
        setError(''); if (await onResolve(summary.trim())) setSummary('');
      }}>
        <p className="text-sm text-neutral-700">Finalizar una intervención no equivale a validarla. Para cerrar, todas las intervenciones requeridas deben estar validadas por coordinación.</p>
        <Textarea id="incident-resolution-summary" label="Cómo se resolvió la incidencia" value={summary} onChange={setSummary} disabled={busy} required maxLength={2000} />
        {!detail.canResolve && <p className="text-sm text-alert-warning-fg">Falta relacionar al menos una intervención o validar todas las requeridas.</p>}
        <Button type="submit" size="lg" loading={busy} disabled={!detail.canResolve}>Validar resolución y cerrar incidencia</Button>
      </form>}
      <details className="border-t border-neutral-200 pt-2">
        <summary className="min-h-12 cursor-pointer py-3 text-sm font-medium text-brand-800">{closed ? 'Reabrir el caso' : 'Observar la resolución'} · Con motivo</summary>
      <form className="space-y-3 pt-3" onSubmit={async (e) => {
        e.preventDefault(); if (!reason.trim()) { setError('Explica qué queda pendiente de resolver.'); return; }
        setError(''); if (await onObserve(reason.trim())) setReason('');
      }}>
        <Textarea id="incident-resolution-observation" label="Observación sobre la resolución" value={reason} onChange={setReason} required disabled={busy} maxLength={2000} />
        <p className="text-sm text-neutral-700">La incidencia sigue o vuelve a estar abierta. No invalida automáticamente intervenciones compartidas ya aprobadas.</p>
        <Button type="submit" variant="secondary" size="lg" loading={busy}>{closed ? 'Reabrir incidencia con observación' : 'Observar resolución'}</Button>
      </form>
      </details>
      {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
    </div>
  </Card>;
}
