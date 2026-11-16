'use client';

import { useState } from 'react';
import type { IncidentDetail } from '@shared/types';
import { Button, Card, Textarea } from '@/components/ui';
import { CLOSURE_BLOCKERS } from '@/lib/incidentLabels';
import { incidentDate } from '@/lib/incidentNavigation';

const MAX_SUMMARY = 2000;

/** Solo coordinación cierra, con todo el trabajo vinculado validado (SPEC-201 §3.8). */
export function IncidentClosureCard({ detail, busy, onClose }: {
  detail: IncidentDetail; busy: boolean; onClose: (summary: string) => Promise<boolean>;
}) {
  const { incident, closureBlockers, similarCases, capabilities } = detail;
  const [summary, setSummary] = useState('');
  if (incident.closedAt) return <Card title="Cierre">
    <p className="text-sm">Cerrada el {incidentDate(incident.closedAt)} por {incident.closedBy?.fullName}.</p>
    <p className="mt-2 whitespace-pre-wrap break-words">{incident.resolutionSummary}</p>
  </Card>;
  return <Card title="Cierre">
    <div className="space-y-4">
      {closureBlockers.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-900">
        {closureBlockers.map((b) => <li key={b}>{CLOSURE_BLOCKERS[b]}</li>)}</ul>}
      {similarCases.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-brand-700">Cómo se resolvieron casos parecidos</summary>
        <ul className="mt-2 space-y-2">{similarCases.map((c) => <li key={c.id}><span className="font-medium">{c.code}</span>: {c.resolutionSummary}</li>)}</ul>
      </details>}
      <Textarea id="incident-resolution" label="Solución aplicada" value={summary} rows={3} maxLength={MAX_SUMMARY}
        disabled={busy || !capabilities.canClose} onChange={setSummary}
        helperText="Qué se hizo. Se sugerirá en incidencias parecidas." />
      <Button type="button" size="lg" disabled={busy || !capabilities.canClose || !summary.trim()}
        onClick={() => void onClose(summary.trim())}>Cerrar incidencia</Button>
    </div>
  </Card>;
}
