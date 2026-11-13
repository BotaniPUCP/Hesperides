'use client';

import { useState, type ReactNode } from 'react';
import type { IncidentOption, LinkedIncidentIntervention } from '@shared/types';
import { Button } from '@/components/ui';
import { IncidentWorkSearch } from './IncidentWorkSearch';

export interface CaptureWorkLink { work: LinkedIncidentIntervention; purposeCode: string }

export function IncidentCaptureLinks({ value, onChange, disabled, scopeKey, creationAction, statuses }: {
  value: CaptureWorkLink[]; onChange: (value: CaptureWorkLink[]) => void; disabled: boolean;
  scopeKey: string; creationAction?: ReactNode; statuses?: IncidentOption[];
}) {
  const [active, setActive] = useState(false);
  return <details className="rounded-lg border border-neutral-200 p-4" onToggle={e => { if (e.currentTarget.open) setActive(true); }}>
    <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-brand-800">Intervenciones relacionadas · Opcional{value.length ? ` (${value.length})` : ''}</summary>
    <div className="space-y-4">
      {active && <IncidentWorkSearch scopeKey={scopeKey} disabled={disabled} excludedIds={value.map(l => l.work.id)} creationAction={creationAction} statuses={statuses}
        onSelect={(work) => onChange([...value, { work, purposeCode: 'MITIGATION' }])} />}
      <ul className="space-y-2">{value.map(link => <li key={link.work.id} className="flex flex-wrap items-center gap-3 rounded-md border border-brand-200 bg-brand-50 px-3 py-2">
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{link.work.code} · {link.work.description}</p>
          <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={link.purposeCode === 'PREVENTION'} disabled={disabled}
            onChange={(e) => onChange(value.map(l => l.work.id === link.work.id ? { ...l, purposeCode: e.target.checked ? 'PREVENTION' : 'MITIGATION' } : l))} />Prevención / mejora</label></div>
        <Button variant="ghost" disabled={disabled} aria-label={`Quitar selección ${link.work.code}`} onClick={() => onChange(value.filter(l => l.work.id !== link.work.id))}>×</Button>
      </li>)}</ul>
    </div>
  </details>;
}
